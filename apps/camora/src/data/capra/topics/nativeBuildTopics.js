// Native Build Engineering — C/C++. Learning track for build/release engineers.
//
// Covers the discipline Camora's cloud-native DevOps content does not touch:
// what the pipelines actually compile. Compilation model, linking, GCC and MSVC
// toolchains, make/CMake, cross-compilation, Qt, dependency management, build
// performance, native debugging, sanitizers, testing, and static analysis.
//
// Grounded in primary sources fetched per topic: gcc.gnu.org/onlinedocs,
// llvm.org, learn.microsoft.com/cpp, cmake.org, gnu.org/software/make,
// doc.qt.io, docs.conan.io, valgrind.org, google.github.io/googletest.
//
// Diagrams: /diagrams/devops/nb-*.png from scripts/gen-nativebuild-diagrams.py.
// Category wiring: 'nativebuild' in devopsCategories + devopsTopicCategoryMap
// (devopsTopics.js), merged into the devops chunk by loader.js.

export const nativeBuildTopics = [

  // ─────────────────────────────────────────────────────────────────────
  // 1. The C/C++ Compilation Model
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-compilation-model',
    title: 'The C/C++ Compilation Model',
    icon: 'code',
    color: '#ea580c',
    questions: 5,
    description: 'How a translation unit becomes an object file and why the include graph, not the source line count, determines your build time. Covers the four compilation phases, the One Definition Rule, and the 2026 state of C++20 modules.',
    visualizations: [
      {
        title: 'Four phases, translation units, and the include graph',
        image: '/diagrams/devops/nb-1-compilation-model.png',
        description: `The gcc and clang drivers run a source file through up to four sequential stages, and every build problem you will ever debug belongs to exactly one of them. Knowing which stage failed narrows the search space immediately.

Phase 1 — Preprocess (cpp, or the integrated preprocessor).
Input: hello.cpp plus every header it reaches transitively. Output: hello.ii, a single flat token stream. The preprocessor is a text substitution engine with no knowledge of C++ grammar. It resolves #include by textual insertion, expands macros, evaluates #if / #ifdef, and emits line markers so later diagnostics can point back at the original file. Stop here with -E. This is the stage where a 40-line .cpp becomes 800,000 lines.

  g++ -E -std=c++20 hello.cpp | wc -l
  g++ -E hello.cpp | grep -c '^# 1 '     # count of distinct files pulled in

Phase 2 — Compile proper (cc1 for C, cc1plus for C++).
Input: the preprocessed token stream. Output: assembly text, hello.s. This is where parsing, template instantiation, semantic analysis, optimization, and code generation happen. Stop here with -S. Almost all compile time and almost all memory consumption lives in this phase, and for C++ it is dominated by template instantiation and inline expansion, not by parsing.

Phase 3 — Assemble (as).
Input: hello.s. Output: hello.o, an ELF relocatable object. Stop here with -c. This phase is fast and rarely fails; when it does, the cause is usually inline asm or an unsupported instruction for the selected -march.

Phase 4 — Link (collect2, which drives ld).
Input: all .o files, archives, and shared objects. Output: an executable or shared library. Symbol resolution and relocation happen here. This is the phase whose errors read nothing like the others: undefined reference, duplicate symbol, and cannot find -lfoo.

The translation unit is the compilation atom:

A translation unit (TU) is one source file plus everything the preprocessor pulled into it, after conditional compilation. The compiler sees TUs, never "the project". Two consequences follow. First, every TU independently re-parses and re-instantiates every template it touches — this is why a project with 500 .cpp files that each include the same 200 KB of headers does roughly 500x the parsing work. Second, the compiler cannot diagnose most cross-TU inconsistencies, because it only ever sees one TU at a time. That gap is exactly where the One Definition Rule lives.

The include graph is the real build cost model:

Rebuild cost is not proportional to lines of code. It is proportional to the number of TUs that transitively include the header you touched, multiplied by the cost of compiling each of those TUs. A single widely included header — a config.h, a common types header, a logging header that pulls in a serialization library — turns every one-line change into a full rebuild.

  # who includes what, from a real build
  g++ -H -c src/service.cpp 2>&1 | head -50   # nesting depth shown by leading dots
  g++ -MMD -MP -c src/service.cpp             # emit service.d for make dependency tracking

The -MMD -MP pair is the standard depfile idiom: -MMD writes a make rule listing every non-system header the TU depends on, and -MP adds phony targets for each header so deleting a header does not break the build with "No rule to make target". Include the generated .d files back into your makefile with a line like:

  -include $(OBJS:.o=.d)

Declaration versus definition is the axis everything turns on:

A declaration tells the compiler a name exists and what its type is. A definition provides the body or storage. Headers should contain declarations; source files should contain definitions. The exceptions — inline functions, constexpr functions, class definitions, and templates — must be visible in every TU that uses them, which is precisely why they live in headers and why headers get heavy.

Cutting the graph:

Forward declaration works when you only need a pointer or reference to a type, not its layout. The pimpl idiom pushes an entire dependency subtree behind an opaque pointer, so changing a private member no longer recompiles every client. Explicit instantiation with extern template moves template code generation into one TU instead of all of them. Precompiled headers cache the parsed state of a stable header set. C++20 modules replace textual inclusion with a compiled interface artifact that is parsed once.`,
      },
      {
        title: 'Quick-fire interview answers — Compilation model',
        description: `Q: What exactly is a translation unit?
A: One source file plus every header the preprocessor textually inserted into it, after conditional compilation has been resolved. It is the unit the compiler actually processes and the unit that produces one object file. The compiler never sees the whole program, which is why cross-TU errors surface only at link time or not at all.

Q: Why must template definitions be in headers?
A: The compiler can only instantiate a template when it sees both the template definition and the concrete template arguments. If the definition lives in a separate .cpp, the TU that uses vector of MyType has no body to instantiate and you get an undefined reference at link time. The escape hatch is explicit instantiation: define the template in a .cpp, then write template class Foo<int>; there, and declare extern template class Foo<int>; in the header.

Q: Include guards or pragma once?
A: Functionally both prevent double inclusion within a TU. pragma once is shorter, immune to guard-name collisions, and is supported by GCC, Clang, and MSVC, but it is not standard and it identifies files by inode or content, which can misbehave with symlinked or bind-mounted build trees. Include guards are standard and always correct. Most large codebases pick one and enforce it with a linter; the choice matters far less than consistency.

Q: What is the actual difference between a declaration and a definition?
A: A declaration introduces a name and its type. A definition additionally allocates storage or provides a body. You can declare a name many times; you can define it once per translation unit. extern int x; is a declaration, int x; at namespace scope is a definition, class Foo; is a declaration, and class Foo { ... }; is a definition.

Q: Does the compiler catch ODR violations?
A: Usually not. The standard says a program with conflicting definitions across TUs is ill-formed, no diagnostic required, because no single TU has enough information to detect it. LTO catches some cases because it sees all TUs at once and will warn about type mismatches. Otherwise you find them as silent memory corruption when two TUs disagree about a struct layout because one was compiled with a different -D flag.

Q: What does -H do?
A: It prints the include tree during compilation, one line per header, with leading dots indicating nesting depth. It is the fastest way to find out why a trivial .cpp takes eight seconds to compile — you will usually find one header near the top pulling in a hundred more.`,
      },
    ],
    introduction: `Every C and C++ build problem you will be asked to debug in an interview reduces to one question: which of the four phases failed, and what did that phase actually see? The driver you invoke as gcc or g++ is not a compiler. It is a program that inspects file suffixes, decides which subprocesses to run, and chains them together: preprocess, compile proper, assemble, link. The GCC manual is explicit about this four-stage model, and it is worth internalizing because the error messages from each stage are completely different in character.

The unit the compiler operates on is the translation unit: one source file plus every header the preprocessor pulled in, after #if and #ifdef were resolved. The compiler compiles TUs in isolation and has no view of the program as a whole. That isolation is what makes parallel builds possible and what makes the One Definition Rule necessary. The ODR says a definable item may be defined at most once per TU, and that if the same entity is defined in multiple TUs the program is ill-formed with no diagnostic required — a phrase that means the compiler is permitted to say nothing and let you find out in production.

The escape valves for entities that genuinely need to appear in many TUs are inline functions, inline variables, class definitions, and templates. Each may be defined in multiple TUs provided the definitions are token-for-token identical and every name resolves the same way. Templates in particular cannot be compiled ahead of use, because the compiler needs the concrete template arguments to instantiate a body; that single fact is why template definitions live in headers, why headers keep growing, and why C++ compiles slowly.

The economic consequence is that build time in a large C++ project is a function of the include graph, not of source line count. If a header is transitively included by 900 translation units, changing one line in it costs 900 recompiles, each of which re-parses and re-instantiates the same templates. The standard mitigations are all forms of graph pruning: forward declarations instead of includes, the pimpl idiom to hide implementation dependencies behind an opaque pointer, explicit instantiation with extern template to compile a template once, precompiled headers to cache a stable prefix, and unity builds to amortize header parsing across many .cpp files at the cost of ODR risk and worse incrementality.

C++20 modules were designed to fix this at the language level by replacing textual inclusion with a compiled module interface that is parsed once and imported. In 2026 the honest status is: the compilers mostly work, the build systems mostly do not, and the standard library module is still the weak link. GCC still gates modules behind -fmodules and describes support as experimental. Clang documents a working two-phase model with .cppm interface units and .pcm built module interfaces, but is explicit that BMIs are compiler-specific, not distributable, and require a P1689 scanning pass via clang-scan-deps before any compilation can be ordered. That scanning requirement is the reason adoption is slow: it inverts the build system's dependency model.

What an interviewer probes here is whether you understand cause and effect rather than reciting flags. Expect: walk me through what happens between hello.cpp and ./hello. Why is this header expensive. Why did this link fail when the compile succeeded. Why did the same code behave differently in the test binary and the production binary. The good answers all start by identifying which phase the evidence points at.`,
    whenToUse: [
      'Diagnosing why a one-line header change triggers a 30-minute rebuild — the include graph is the model you reason with',
      'Deciding whether a new type belongs in a header, behind a forward declaration, or behind a pimpl boundary',
      'Explaining an undefined reference for a template that visibly exists in the codebase',
      'Auditing a build for ODR hazards after discovering that different targets compile the same headers with different -D flags',
      'Evaluating precompiled headers, unity builds, or C++20 modules as a build-time intervention and being able to state the cost of each',
    ],
    keyConcepts: [
      {
        term: 'Translation unit',
        definition: 'One source file after preprocessing: the file itself plus every transitively included header, with conditional compilation resolved. The compiler processes exactly one TU per invocation and produces exactly one object file. It has no visibility into any other TU, which is the root cause of every link-time and ODR surprise.',
      },
      {
        term: 'The four phases',
        definition: 'Preprocess (-E, produces .i or .ii), compile proper (-S, produces .s via cc1 or cc1plus), assemble (-c, produces .o via as), link (produces the executable or shared object via collect2 driving ld). Each phase has a distinct failure signature; identifying the phase is the first step of any build diagnosis.',
      },
      {
        term: 'One Definition Rule (ODR)',
        definition: 'At most one definition of any definable item per translation unit. Across TUs, inline functions, inline variables, class types, and templates may be defined more than once only if every definition is token-for-token identical and all names resolve identically. Violations are ill-formed, no diagnostic required — the compiler is allowed to stay silent and the linker will happily pick one definition arbitrarily.',
      },
      {
        term: 'Declaration versus definition',
        definition: 'A declaration introduces a name and type (extern int x;, void f();, class Foo;). A definition provides storage or a body (int x;, void f() {}, class Foo { ... };). Headers carry declarations plus the ODR-exempt categories; source files carry definitions. Getting this boundary wrong is the most common source of both link errors and rebuild bloat.',
      },
      {
        term: 'Explicit instantiation and extern template',
        definition: 'template class Foo<int>; in one .cpp forces the compiler to emit the full instantiation there. extern template class Foo<int>; in the header tells every other TU not to instantiate it. Together they move template codegen out of every TU into one, cutting both compile time and object size for heavily used instantiations.',
      },
      {
        term: 'Pimpl idiom',
        definition: 'A class exposes only a pointer to an incomplete Impl type in its header; all real members and their includes move into the .cpp. Clients recompile only when the public interface changes, not when a private member or a private dependency changes. The cost is one heap allocation per object and one pointer indirection per member access.',
      },
      {
        term: 'Precompiled header (PCH)',
        definition: 'A serialized snapshot of the compiler state after parsing a fixed set of headers, reused across TUs. GCC treats .h files as PCH candidates and looks for a .gch alongside the header. Effective only when the header set is genuinely stable and every TU uses identical flags — a flag mismatch silently invalidates the PCH and you pay the parse cost anyway.',
      },
      {
        term: 'C++20 module and BMI',
        definition: 'A module interface unit (conventionally .cppm in Clang) is compiled into a built module interface, a .pcm file, which importers consume instead of re-parsing text. BMIs are compiler-version-specific, are not a distribution format, and are not an information-hiding mechanism — they contain everything used to build them in recoverable form. Build order requires a dependency scan (clang-scan-deps, P1689 format) before compilation can begin.',
      },
    ],
    approach: [
      'Establish the baseline: time a clean build and a one-header-touch incremental build separately, so you know whether you are fixing full-build throughput or incremental latency',
      'Measure the include graph with g++ -H (or clang -H) on your three slowest TUs and find the header near the top of the tree that drags in the most',
      'Wire up depfiles with -MMD -MP and include the generated .d files, so incremental correctness stops depending on hand-maintained dependency lists',
      'Cut the graph in the cheapest order: replace includes with forward declarations where only pointers or references are needed, then apply pimpl to the two or three classes with the widest client base',
      'Add extern template declarations for the heaviest template instantiations, with matching explicit instantiations in one TU, and re-measure object sizes',
      'Only then consider PCH or unity builds, and only with a build-flag audit first — both amplify ODR hazards and both degrade incremental rebuild granularity',
      'Layer a compiler cache (ccache or sccache) last; it hides the symptom of a bad include graph on CI but does nothing for a developer editing a hot header',
    ],
    pitfalls: [
      'Compiling the same header with different -D flags in different targets (one target with NDEBUG, one without) so a struct has two different layouts — an ODR violation that the compiler cannot see and that manifests as memory corruption at a member offset',
      'Defining a non-inline free function in a header, which links fine in a single-TU test and fails with duplicate symbol the moment a second TU includes it',
      'Adding an include to a widely shared header for the convenience of one call site, silently adding it to hundreds of TUs and adding minutes to every incremental build',
      'Assuming pragma once is equivalent to include guards in a build tree with symlinks, bind mounts, or a copied source directory — the same header can be seen as two distinct files and get included twice',
      'Turning on unity builds to speed up CI and then spending weeks on the resulting internal-linkage collisions, static initialization order changes, and macro leakage between concatenated files',
      'Adopting C++20 modules mid-project without checking whether the build system supports P1689 dependency scanning, and discovering that build order cannot be computed at all',
    ],
    keyQuestions: [
      {
        question: 'Walk me through everything that happens between hello.cpp and a running ./hello.',
        answer: `Four phases, each with a distinct input, output, and failure mode.

Preprocessing. The driver runs the preprocessor over hello.cpp. It resolves every #include by textually inserting the header, expands macros, evaluates #if and #ifdef, strips comments, and emits line markers so later diagnostics can attribute errors to the original file and line. The output is a single flat token stream, conventionally hello.ii for C++. Nothing here understands C++ grammar; it is text substitution.

  g++ -E -std=c++20 hello.cpp -o hello.ii

Failure signature: fatal error: foo.h: No such file or directory, or a macro expanding to something unexpected. If you suspect a macro problem, -E is how you settle the argument in ten seconds.

Compilation proper. The driver runs cc1plus (cc1 for C) on the token stream. This is parsing, name lookup, overload resolution, template instantiation, semantic checks, optimization passes, and code generation. Output is target assembly text.

  g++ -S -O2 hello.cpp -o hello.s

Failure signature: everything you think of as a compiler error — type errors, template instantiation backtraces, missing members. This phase is where essentially all compile time goes. For C++ specifically, template instantiation and inlining dominate; parsing is rarely the bottleneck once headers are counted.

Assembly. The assembler as turns hello.s into hello.o, an ELF relocatable object file containing sections (.text, .data, .rodata, .bss), a symbol table (.symtab) with defined and undefined symbols, and relocation entries recording every address the linker still needs to patch.

  g++ -c hello.cpp -o hello.o

Failure signature: rare. Bad inline asm, or an instruction the selected -march does not permit.

Linking. The driver invokes collect2, which invokes ld. The linker reads all objects and libraries, resolves every undefined symbol against a definition, lays out sections into segments, applies relocations, writes the program headers, and records the dynamic dependencies. For a dynamically linked program it also records the ELF interpreter (ld.so) and the DT_NEEDED entries.

  g++ hello.o -o hello -lstdc++

Failure signature: undefined reference to, multiple definition of, cannot find -lfoo. Completely different vocabulary from compile errors — that vocabulary alone tells you which phase you are in.

Then runtime. execve loads the ELF, the kernel maps the segments and transfers control to the interpreter named in PT_INTERP, typically /lib64/ld-linux-x86-64.so.2. The dynamic linker loads every DT_NEEDED shared object, applies dynamic relocations, runs initializers, and finally jumps to _start, which sets up the C runtime and calls main.

The one command that shows the whole chain is gcc -v, which prints the actual subprocess command lines, or gcc -### which prints them without executing. Being able to say "the driver is not the compiler, it is a process launcher, and here is how I get it to show me what it launches" is the answer that separates people who have debugged a real toolchain from people who have only used one.`,
      },
      {
        question: 'What is the One Definition Rule, and how does it actually break in production?',
        answer: `The rule has two halves. Within a single translation unit, no definable item may be defined more than once — the compiler enforces this and gives you a clean error. Across translation units, the standard says the program is ill-formed if the same entity is defined more than once, and adds that a diagnostic is required only in narrow module-related cases. Everywhere else it is ill-formed, no diagnostic required. No single TU has the information needed to detect the conflict, so no tool is obligated to tell you.

Certain entities are exempt because they genuinely must appear in many TUs: inline functions, inline variables, class types, enumerations, and templates. The exemption is conditional. Every definition must consist of the same sequence of tokens, and every name in those tokens must refer to the same entity after lookup. If both hold, the linker picks one and discards the rest — that is what a weak or COMDAT symbol is for. If either fails, you have undefined behavior with no error.

How it actually breaks:

Case 1 — the same header compiled with different macros. Library A is built with -DNDEBUG, application B is not. A struct in a shared header has an extra member under #ifndef NDEBUG. Now the two sides disagree about sizeof and about member offsets. The linker sees one weak inline constructor and keeps one copy. Objects are constructed with one layout and read with another. The symptom is corruption at a fixed offset, hundreds of milliseconds after the actual bug. This is by far the most common real-world ODR failure and it is a build-system problem, not a code problem.

Case 2 — a non-inline function defined in a header. The first TU is fine. The second gives multiple definition of foo. This one is loud and easy.

Case 3 — two static libraries each containing a class with the same name but different definitions, common after vendoring the same third-party library at two versions. Both define _ZN3Foo3barEv. The linker takes the first one it resolves and every call site in both libraries now runs the same implementation, which is correct for exactly one of them.

Case 4 — anonymous-namespace or static entities leaking under unity builds. Concatenating .cpp files means two file-local helpers with the same name are now in the same TU, and internal linkage no longer separates them.

Case 5 — differing -std or differing _GLIBCXX_USE_CXX11_ABI between components, which changes the layout of std::string and the mangled names of anything taking one. This usually shows as an undefined reference mentioning __cxx11 rather than as silent corruption, which is the lucky outcome.

Detection. LTO is the best general tool, because it holds all TUs at once and will emit warnings about type mismatches that per-TU compilation cannot see. The gold and lld linkers can also flag some conflicts. -Wodr specifically exists for the LTO case. Beyond that, the AddressSanitizer ODR indicator catches duplicate global definitions at startup. But the durable fix is structural: define your build flags in one place, never per-target, and make sure every consumer of a header compiles it with the same macro set. Prescribing "use inline correctly" is not the answer an interviewer is waiting for; "audit that all consumers of a header see identical preprocessor state" is.`,
      },
      {
        question: 'Why do templates have to live in headers, and what do you do when that is unacceptable?',
        answer: `A template is not code. It is a pattern from which the compiler generates code once it knows the arguments. When TU A writes Container<Widget>, the compiler must instantiate the body of every member it uses with T substituted by Widget. To do that it needs the definition, not just the declaration. If the definition sits in container.cpp, then container.cpp has no idea Widget exists, and TU A has no body to instantiate. The compile succeeds — the declaration is enough to type-check the call — and the link fails with undefined reference to Container<Widget>::push. This is the single most common "but the code is right there" link error in C++.

Consequences you should be able to state:

Every TU that instantiates the same specialization compiles the same code independently. The compiler emits it as a COMDAT or weak symbol, and the linker discards the duplicates. So you pay full compile cost N times and full object-size cost N times, then throw N-1 away at link. On a large project this is a substantial and completely invisible tax.

Because the definitions are in headers, template-heavy headers are large, and large headers propagate through the include graph. Template libraries are the main reason C++ incremental builds are slow.

The remedies, in order of how often they are the right call:

Explicit instantiation. Keep the definition in a .cpp or a separate .tpp included only there, and force the instantiations you actually ship:

  // container.cpp
  #include "container.h"
  #include "container_impl.h"
  template class Container<Widget>;
  template class Container<int>;

Then in the header, tell every other TU not to bother:

  // container.h
  extern template class Container<Widget>;
  extern template class Container<int>;

Compile time drops because only one TU instantiates. The constraint is that the set of instantiations must be closed and known — this works for a library with a fixed set of value types, and does not work for a general-purpose container.

extern template alone. Even when the definition stays in the header, adding extern template for hot instantiations in widely included headers suppresses redundant instantiation in every consumer while one designated TU provides it. This is a pure win and is underused.

Type erasure. Push the generic part to a thin inline wrapper over a non-template implementation that operates on void pointers or a small abstract interface. std::function and PIMPL-style handle classes do this. You trade an indirect call for a massive reduction in instantiated code.

Concepts and constraints (C++20). These do not reduce instantiation cost, but they collapse template error messages from forty-line backtraces to one line, which is a real maintenance win and a reasonable thing to mention.

What not to say: "use the export keyword". It was removed in C++11 and only one front end ever implemented it. Mentioning it as a live option is a tell.`,
      },
      {
        question: 'Our build takes 40 minutes and touching one header rebuilds 800 files. Walk me through fixing it.',
        answer: `Measure first, and measure the right thing. Clean-build wall time and incremental-rebuild latency are different problems with different fixes. The complaint here is incremental, so the target is the include graph.

Step 1 — find the hub headers. Run the compiler with -H on a few representative TUs; it prints the include tree with dot-depth indicating nesting. Then count reverse dependencies across the project: for each header, how many TUs transitively include it. The generated .d files from -MMD are already a machine-readable answer to that question if you have them. You are looking for the small number of headers that appear in almost every TU. There are usually three to five.

Step 2 — wire up depfiles if they are missing. Compile with -MMD -MP and pull the .d files back in:

  CXXFLAGS += -MMD -MP
  -include $(OBJS:.o=.d)

-MMD emits a make rule listing the non-system headers the TU actually read; -MP adds a phony target for each header so deleting a header does not produce "No rule to make target". Without this, incremental builds are either wrong (stale objects) or over-broad (rebuild everything), and any measurement you take is noise.

Step 3 — cut includes that do not need to be there. If a header only uses Foo as a pointer, a reference, a return type, or a parameter type in a declaration, then class Foo; is enough. You need the full definition only for: members by value, base classes, sizeof, member access, and anything requiring the complete type. Include What You Use automates the audit but its output needs human review.

Step 4 — pimpl the widest-blast-radius classes. Take the two or three classes whose headers everything includes and move their private members and private includes behind an opaque pointer. The header then depends on nothing but a forward declaration and a unique_ptr. Now changing a private member recompiles one TU instead of 800. The runtime cost is one allocation per instance and one indirection per access, which is irrelevant for a service object and unacceptable for a value type in a hot loop — apply it deliberately, not uniformly.

Step 5 — extern template for the hot instantiations. Add extern template declarations in the header and matching explicit instantiations in one TU. This kills redundant instantiation work across every consumer.

Step 6 — precompiled headers, with eyes open. A PCH caches the parsed state of a fixed prefix of stable headers. It helps a lot when the header set is genuinely stable (the standard library, a large framework). It helps nothing if the PCH content changes often, and GCC silently falls back to normal parsing if the compilation flags do not match the flags the PCH was built with, so you can end up paying the cost and getting nothing. Verify with -Winvalid-pch.

Step 7 — compiler cache. ccache or sccache turns a clean rebuild into a hash lookup and is transformative for CI, where the same commit is built repeatedly. It does nothing for the developer who just edited a hot header, because those hashes are all new. Add it, but do not let it become the reason nobody fixes the graph.

Unity builds and modules, briefly. Unity builds concatenate many .cpp files to amortize header parsing; they can halve a clean build and they make incremental builds worse and ODR hazards sharper. C++20 modules are the real fix in principle but in 2026 the build-system story is still the blocker — you need P1689 scanning to even compute build order, and GCC still calls its support experimental behind -fmodules.

The ordering matters in the answer: measure, fix dependency tracking, cut the graph, then buy speed with caching. Reaching for ccache first is the wrong instinct and interviewers notice.`,
      },
      {
        question: 'Where do C++20 modules actually stand in 2026, and would you adopt them?',
        answer: `The mechanism first. A module interface unit declares export module foo; and is compiled into a built module interface — a .pcm in Clang, conventionally written from a .cppm source. Consumers write import foo; and the compiler reads the BMI instead of re-parsing text. Macros do not leak across the boundary, include order stops mattering, and each interface is parsed once instead of once per consumer. That is the whole promise: the include-graph tax disappears.

Where the implementations are. Clang has the most complete and best documented story: two-phase build (precompile the interface to a BMI, then compile the BMI to an object), or one-phase with -fmodule-output. GCC has had modules since GCC 11 but still gates them behind -fmodules and still describes the support as experimental in its C++ status page. MSVC has shipped the most production mileage, largely because it also controls its build system.

Why adoption is slow, and this is the part that matters in an interview:

The dependency graph is no longer statically knowable from the source text. With headers, make or ninja can compute build order from #include lines. With modules, a TU's dependencies come from import declarations that may be behind conditionals, and a module must be compiled before anything that imports it. So the build system needs a scanning pass first. Clang provides clang-scan-deps emitting P1689 format for exactly this, and CMake and ninja have grown support for it, but any homegrown or legacy build system has to be rewritten. That is the real cost.

BMIs are not artifacts you can ship. Clang states plainly that BMIs should not be treated as an information-hiding mechanism and should be assumed to contain everything used to create them in recoverable form. They are tied to the exact compiler version and flags. You cannot put a BMI in an archive and call it a module library; you compile the module unit to an object file and archive that, and every consumer builds its own BMI. So modules do not give you a distributable binary interface — they give you a per-build-tree cache.

The standard library module is the last mile. import std; is what makes modules worth it for most code, because the standard library headers are the heaviest thing most TUs include. Support has been landing but is still uneven across toolchains and still requires build-system cooperation to compile the std module in your tree first.

Mixed #include and import is fragile. Clang documents known ordering issues when a TU does both, which is exactly what any incremental migration requires.

Would I adopt? For a greenfield project on a single pinned toolchain with CMake and ninja, yes, and the build-time win is real. For an existing large codebase that must build on two compilers and ship headers to consumers, no — not yet. The pragmatic 2026 position is to do the work that pays off either way: fix the include graph, adopt pimpl and forward declarations, get depfiles right, and structure code so that a later module migration is a mechanical transformation rather than an architecture change. Answering "modules solve this, we should switch" without mentioning the scanning requirement or BMI non-distributability is the answer that gets marked down.`,
      },
    ],
    references: [
      'https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html',
      'https://eel.is/c++draft/basic.def.odr',
      'https://clang.llvm.org/docs/StandardCPlusPlusModules.html',
      'https://gcc.gnu.org/projects/cxx-status.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Preprocessor-Options.html',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. Linking Deep Dive
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-linking',
    title: 'Linking Deep Dive',
    icon: 'link',
    color: '#ea580c',
    questions: 6,
    description: 'Symbol resolution semantics and link failure diagnosis: why archive order matters, what SONAME and RUNPATH actually control at load time, and how visibility and linker choice change both ABI surface and link speed.',
    visualizations: [
      {
        title: 'Symbol resolution, archive semantics, and the dynamic load path',
        image: '/diagrams/devops/nb-2-linking.png',
        description: `The linker has one job: make every undefined symbol point at exactly one definition, then patch the addresses. Everything confusing about linking follows from how it walks its inputs to do that.

Symbol classes:

Defined (strong) — the object provides a body or initialized storage. Two strong definitions of the same name is a hard error: multiple definition of foo.
Undefined — the object references a name it does not define. Must be satisfied or you get undefined reference to foo.
Weak — declared with __attribute__((weak)) or emitted as COMDAT for inline functions and template instantiations. A strong definition overrides a weak one silently; multiple weak definitions are deduplicated with no error. This is what makes inline functions and templates in headers legal at link time, and it is also what makes ODR violations silent.
Common — historically, tentative definitions in C (int x; at file scope with no initializer) were emitted as common symbols and merged. GCC 10 changed the default to -fno-common, so these are now normal definitions and duplicate tentative definitions in two C files are an error. If you are porting old C and suddenly see multiple definition errors on globals, that change is the cause.

Object files versus archives — the rule everyone gets wrong:

Object files given on the command line are always fully linked in. Their order does not affect whether symbols resolve.

Archives are different. An archive (.a) is a container of object files plus an index. When the linker reaches an archive, it extracts only those members that resolve symbols currently undefined, and then it moves on. The GNU ld documentation is explicit: an archive is searched only once, in the order specified on the command line. So this fails:

  g++ -lmylib main.o          # -lmylib seen first, nothing undefined yet, nothing extracted
  # undefined reference to 'mylib_init'

and this works:

  g++ main.o -lmylib          # main.o creates the undefined symbol, then the archive supplies it

The general rule: put dependents before dependencies. If libA needs libB, write -lA -lB.

Circular dependencies between archives cannot be ordered correctly by construction. That is what --start-group and --end-group are for: the enclosed archives are searched repeatedly until no new undefined symbols are resolved. The ld manual warns this has a significant performance cost and should only be used for unavoidable circular references.

  g++ main.o -Wl,--start-group -lA -lB -lC -Wl,--end-group

--whole-archive forces every member of an archive in regardless of need. You need it for static libraries whose value is in static initializers or registration side effects, since nothing references those symbols.

Static versus shared:

A static archive is a bag of objects; linking copies the needed members into your binary. No runtime dependency, larger binary, and a security patch to the library requires relinking every consumer.

A shared object is loaded at runtime. The link records a DT_NEEDED entry containing the library's SONAME, not its path. The SONAME (set with -Wl,-soname,libfoo.so.1) is the ABI contract: libfoo.so.1.4.2 is the file, libfoo.so.1 is the SONAME, libfoo.so is the development symlink. Bumping the SONAME major means "the ABI changed, old binaries must not load this".

PIC and PIE. Shared objects must be built with -fPIC so their code works at any load address, accessing globals through the GOT and cross-object calls through the PLT. -fpic is the cheaper variant with a machine-specific GOT size limit (28k on AArch64, 32k on m68k and RS/6000, unlimited on x86); overflow means recompiling with -fPIC. -fPIE plus -pie makes the main executable relocatable too, which is what ASLR needs and what every distribution now defaults to.

Runtime search order, exactly:

1. DT_RPATH, but only if DT_RUNPATH is absent
2. LD_LIBRARY_PATH, unless in secure-execution mode
3. DT_RUNPATH — direct dependencies only, not transitive
4. /etc/ld.so.cache
5. /lib and /usr/lib (or the lib64 variants)

The critical asymmetry: LD_LIBRARY_PATH beats RUNPATH but loses to RPATH. That is why modern toolchains default to --enable-new-dtags, emitting RUNPATH, so operators can still override with the environment.`,
      },
      {
        title: 'Quick-fire interview answers — Linking',
        description: `Q: Why does -lfoo have to come after the objects that use it?
A: Because the linker processes inputs left to right and searches an archive only once, extracting only members that satisfy symbols that are already undefined at that moment. If the archive is seen before anything references it, nothing is undefined yet, nothing gets extracted, and the archive is never revisited. Object files are unconditional so their order does not matter.

Q: What is the difference between RPATH and RUNPATH?
A: Both embed search directories in the binary. RPATH (DT_RPATH) is consulted before LD_LIBRARY_PATH and applies transitively to dependencies of dependencies. RUNPATH (DT_RUNPATH) is consulted after LD_LIBRARY_PATH and applies only to the binary's direct DT_NEEDED entries. If a binary has RUNPATH, RPATH is ignored entirely. Modern linkers emit RUNPATH by default via --enable-new-dtags.

Q: What does SONAME do?
A: When you link against libfoo.so, the linker copies that library's SONAME into your binary's DT_NEEDED entry rather than the filename you passed. At runtime ld.so looks for the SONAME. This is what lets you install libfoo.so.1.4.2 and libfoo.so.1.5.0 side by side and have old binaries keep loading the 1.x they were built for.

Q: Why -fvisibility=hidden?
A: It flips the default so nothing is exported unless you explicitly mark it. Fewer exported symbols means fewer dynamic relocations to process at load time, a smaller dynamic symbol table to search, no accidental ABI commitments to internal helpers, and better optimization because the compiler knows a hidden symbol cannot be interposed. The GCC manual states it can very substantially improve linking and load times.

Q: LTO gave me a link error that the normal build did not. Why?
A: Because LTO defers code generation to link time and holds all translation units at once, so it sees inconsistencies that per-TU compilation structurally cannot: mismatched declarations of the same function or object across TUs, and type mismatches that -Wodr reports. It is usually finding a real latent bug rather than creating a new one.

Q: bfd, gold, lld, or mold?
A: bfd is the GNU default and the most compatible; gold is ELF-only and now deprecated upstream; lld ships with LLVM, is substantially faster than bfd, and is the default on many toolchains; mold is faster still through aggressive parallelism and is the right choice for large link-bound C++ builds. Select with -fuse-ld=lld or -fuse-ld=mold. The main risk with the newer linkers is unsupported or differently interpreted linker script features.`,
      },
    ],
    introduction: `Linking is where a program stops being a set of independently compiled translation units and becomes one address space. Every TU emitted a symbol table with definitions it provides and references it does not, plus relocation records marking every place an address still needs to be filled in. The linker's contract is to bind each undefined reference to exactly one definition, lay out the sections, apply the relocations, and record what still has to happen at load time.

The reason linking feels arbitrary to most engineers is that the linker processes its inputs strictly left to right and treats object files and archives by different rules. Object files are unconditional — every one you name is fully linked in. An archive is a lazy container: when the linker reaches it, it pulls in only the members that resolve symbols currently undefined, and then it never looks at that archive again. The GNU ld manual states this directly: an archive is searched only once, in the order it appears on the command line. That single sentence explains most undefined reference errors in build systems that got the library order wrong, and it explains why --start-group exists and why the manual warns that it carries a significant performance cost.

The second half of linking happens at load time and is where production incidents actually come from. A dynamically linked binary does not record library paths; it records DT_NEEDED entries containing each library's SONAME. At exec time, ld.so resolves each of those names against a defined search order — DT_RPATH if there is no DT_RUNPATH, then LD_LIBRARY_PATH unless in secure-execution mode, then DT_RUNPATH for direct dependencies only, then /etc/ld.so.cache, then the default directories. The subtleties in that list are exactly the ones that bite: RUNPATH suppresses RPATH entirely, RUNPATH is not transitive, and LD_LIBRARY_PATH sits between them.

The third dimension is symbol visibility, and this is where C++ differs sharply from C. By default every non-static symbol in a shared object is exported. For a C++ library that means every inline function, every template instantiation, every implementation detail class becomes part of a dynamic symbol table that the loader must search and relocate, and part of an ABI surface you did not intend to promise. Building with -fvisibility=hidden and explicitly marking the public API — or controlling exports with a version script — cuts load time, shrinks the binary, prevents symbol clashes between libraries, and lets the optimizer assume a hidden symbol cannot be interposed. Drepper's How To Write Shared Libraries is the canonical treatment and its central argument is that export control is the single highest-leverage thing a shared library author does.

Finally, linking has become a performance problem in its own right. On a large C++ codebase with debug info, the link step can take longer than compiling the file you just edited, and it is single-threaded in the traditional bfd linker. The practical levers are linker choice (-fuse-ld=lld or -fuse-ld=mold), --gc-sections with -ffunction-sections -fdata-sections to drop unreferenced code, split debug info with -gsplit-dwarf so the linker does not have to merge gigabytes of DWARF, and, on the other side of the tradeoff, LTO, which makes link time much worse in exchange for cross-TU optimization.

Note that inspecting binaries — readelf, nm, objdump, ldd, c++filt — is covered in its own topic. What matters here is the semantics: what the linker decided, why it decided it, and what changes the decision.`,
    whenToUse: [
      'Diagnosing undefined reference or multiple definition errors where the symbol visibly exists in the source tree',
      'Deciding whether a component ships as a static archive or a shared object, and what that commits you to for ABI stability',
      'Designing the public export surface of a shared library so that internal symbols do not become an accidental ABI promise',
      'Debugging a binary that runs on the build machine and fails at load on the target with a missing shared object',
      'Attacking link time on a large C++ build where the link step dominates the edit-compile-test loop',
      'Reviewing whether enabling LTO is worth it, and what class of latent bugs it will surface on the way in',
    ],
    keyConcepts: [
      {
        term: 'Strong, weak, and common symbols',
        definition: 'A strong definition is a normal function body or initialized global; two of them for the same name is an error. A weak symbol (explicit __attribute__((weak)), or the COMDAT groups emitted for inline functions and template instantiations) may appear many times and the linker keeps one silently. Common symbols were the old C tentative-definition merge behavior; GCC 10 switched the default to -fno-common, so duplicate uninitialized globals across C files now fail to link.',
      },
      {
        term: 'Archive extraction semantics',
        definition: 'A .a is a container plus a symbol index. The linker extracts only those members needed to resolve symbols that are undefined at the moment it reaches the archive, then never revisits it. This is why link order matters for -l but not for .o files, and why the fix for a circular archive dependency is --start-group / --end-group rather than reordering.',
      },
      {
        term: 'SONAME and DT_NEEDED',
        definition: 'The SONAME, set with -Wl,-soname,libfoo.so.1, is the name recorded in the library and copied into every consumer as a DT_NEEDED entry. Consumers therefore depend on an ABI generation, not a filename, which is what allows multiple major versions to coexist on one system. A SONAME bump is the declaration that the old ABI is gone.',
      },
      {
        term: 'PIC and PIE',
        definition: '-fPIC makes code position independent by routing global data access through the GOT and cross-object calls through the PLT; it is mandatory for shared objects. -fpic is a cheaper variant with a target-specific GOT size limit (28k on AArch64, 32k on m68k and RS/6000, unbounded on x86). -fPIE with -pie applies the same treatment to executables so the kernel can load them at a randomized base, which is the default on modern distributions.',
      },
      {
        term: 'RPATH, RUNPATH, LD_LIBRARY_PATH',
        definition: 'Search order at load: DT_RPATH (only when DT_RUNPATH is absent), then LD_LIBRARY_PATH (ignored under setuid), then DT_RUNPATH (direct DT_NEEDED entries only, never transitively), then /etc/ld.so.cache, then the default library directories. --enable-new-dtags emits RUNPATH; --disable-new-dtags emits RPATH. Embedding $ORIGIN makes the path relative to the binary, which is how relocatable install trees work.',
      },
      {
        term: 'Symbol visibility',
        definition: '-fvisibility=hidden makes every symbol local by default; you then mark the public API with __attribute__((visibility("default"))). -fvisibility-inlines-hidden additionally hides out-of-line copies of inline C++ member functions. The GCC manual states this substantially improves link and load times, produces more optimized code, and gives near-perfect API export control. A --version-script achieves the same at link time without touching sources.',
      },
      {
        term: 'Link-time optimization (LTO)',
        definition: '-flto emits GIMPLE bytecode into ELF sections instead of final machine code; at link time all function bodies are read back and optimized as if they were one translation unit. Enables cross-TU inlining and dead code elimination, and surfaces cross-TU declaration mismatches that per-TU compilation cannot see. Costs a much longer, much more memory-hungry link. -flto=auto parallelizes; -flto-partition controls how work is split.',
      },
      {
        term: 'Linker choice',
        definition: 'ld.bfd is the GNU default, single-threaded, most compatible with linker scripts. gold was the ELF-only rewrite and is now deprecated upstream. lld ships with LLVM and is a large step faster. mold is the fastest through aggressive parallelism and is the usual pick for link-bound C++ builds. Select via -fuse-ld=bfd|gold|lld|mold, which GCC documents as an explicit option.',
      },
    ],
    approach: [
      'Classify the failure first: undefined reference means no definition was found or was found too early; multiple definition means two strong definitions; cannot find -lfoo means the library file itself was never located',
      'For undefined reference, confirm the symbol exists somewhere and confirm the mangled name matches — a C++ symbol referenced from C, or a missing extern "C", produces a name that will never match no matter how you order the link line',
      'Fix ordering before adding flags: dependents left, dependencies right; only reach for --start-group when the cycle is genuinely unavoidable, because the ld manual is explicit about its performance cost',
      'For load-time failures, reason about the documented search order rather than guessing, and confirm whether the binary carries RPATH or RUNPATH, because that single fact determines whether LD_LIBRARY_PATH can help you',
      'Set an explicit SONAME on every shared library you ship and treat a SONAME bump as a deliberate ABI-break announcement, not a versioning afterthought',
      'Build shared libraries with -fvisibility=hidden plus explicit export macros, or a version script, and add -Wl,--no-undefined so missing dependencies fail at link rather than at dlopen',
      'Attack link time in order: -ffunction-sections -fdata-sections with --gc-sections, then -gsplit-dwarf, then switch to lld or mold, and only then evaluate whether LTO is worth the regression it will cause',
    ],
    pitfalls: [
      'Putting -l flags before the object files in a build system template, which works by accident while the library is shared (shared objects are not lazily extracted) and breaks the day someone switches it to a static archive',
      'Linking a static library into two different shared objects loaded into the same process, giving each its own copy of the library\'s global state — singletons stop being single and static initialization runs twice',
      'Shipping a shared library without -fvisibility=hidden, exporting thousands of inline and template symbols, then discovering that an internal function is now part of your ABI because a customer linked against it',
      'Embedding an absolute build-tree RPATH into a binary so it works in CI and fails on every other machine, instead of using $ORIGIN-relative RUNPATH',
      'Setting LD_LIBRARY_PATH in a wrapper script to paper over a missing RUNPATH, then losing that override when the binary is later invoked through a setuid path or a service manager that scrubs the environment',
      'Enabling LTO across a codebase that has latent cross-TU declaration mismatches and treating the resulting warnings as an LTO defect rather than the real bugs they are',
    ],
    keyQuestions: [
      {
        question: 'You get "undefined reference to symbol X" but X is clearly defined in the codebase. Walk through your diagnosis.',
        answer: `There are five distinct root causes and they need different fixes, so the first move is to distinguish them rather than to start permuting the link line.

Cause 1 — the definition is in an archive that appears too early. The linker walks inputs left to right and extracts from an archive only what is undefined at that moment; the ld manual states an archive is searched only once in the order given. If -lmylib appears before main.o, nothing is undefined when the archive is reached, so nothing is extracted. Fix: move the library right, after everything that uses it. Rule: dependents before dependencies.

Cause 2 — a genuine circular dependency between archives. libA calls into libB and libB calls back into libA. No single ordering works. Fix: wrap them so the linker iterates until it converges.

  g++ main.o -Wl,--start-group -lA -lB -Wl,--end-group

The manual warns this has a significant performance cost and should be reserved for unavoidable cycles. The better long-term fix is to break the cycle.

Cause 3 — name mangling mismatch. The reference and the definition have different mangled names, so no ordering will ever help. Classic instances: a C++ TU calls a function implemented in C without wrapping the header declaration in extern "C"; the two sides disagree about a default argument type or const qualification, producing two different mangled names; or the two sides were built with different values of _GLIBCXX_USE_CXX11_ABI, so one side wants a std::__cxx11::basic_string parameter and the other wants the old one. The tell for the last case is __cxx11 appearing in the undefined symbol. Fix: make the declaration and definition agree, or make the ABI flag consistent across the whole build.

Cause 4 — the template was never instantiated. The template definition sits in a .cpp, so the TU that uses Container<Widget> had a declaration to type-check against but no body to instantiate. The compile succeeds and the link fails. Fix: move the definition to the header, or add an explicit instantiation in the defining TU.

Cause 5 — the symbol exists in the library but is not exported. The library was built with -fvisibility=hidden or a version script and this symbol was never marked public, so it is local and invisible to the linker. Fix: mark it exported, or accept that it is private and use the public API.

There is also a variant worth naming because it looks identical from the outside: a virtual function was declared but never defined, so the vtable itself cannot be emitted and you get an undefined reference to the vtable rather than to the function. GCC has a specific note for this — the vtable is emitted in the TU that defines the first non-inline, non-pure virtual member, so if that member has no definition, nothing anchors the vtable.

Practically, the ordering fix and the mangling fix cover most cases, and the way to tell them apart in ten seconds is whether the undefined name is a plausible mangling of the function you expect. If it is, it is an ordering or export problem. If it is not — wrong parameter types, missing or extra __cxx11, an unmangled C name where a mangled one was expected — it is a declaration problem and reordering the link line will never fix it.`,
      },
      {
        question: 'Explain why link order matters for static archives but not for object files, and what --start-group actually does.',
        answer: `The distinction is that object files are unconditional inputs and archives are conditional ones.

When ld reads an object file named on the command line, it links the whole thing in. Every section is included, every definition it provides is registered, every reference it makes is added to the undefined set. Order affects section layout in the output, and it affects which of two conflicting definitions wins in some edge cases, but it does not affect whether resolution succeeds.

When ld reaches an archive, it does something different. An archive is a container of object files plus an index mapping symbol names to members. The linker consults the index and pulls in only those members that define symbols currently in the undefined set. Members that resolve nothing are skipped. Then the linker moves past the archive and, in the GNU ld manual's words, an archive is searched only once, in the order specified on the command line. It does not come back.

So consider:

  g++ -lmath main.o

At the moment the linker processes -lmath, the undefined set is empty. No member of libmath.a resolves anything, so none are extracted. Then main.o is read, and it references sqrt_impl. That symbol is now undefined and nothing later on the line provides it. Result: undefined reference. Reverse it:

  g++ main.o -lmath

Now main.o registers sqrt_impl as undefined first, the archive is reached with a non-empty undefined set, and the member defining sqrt_impl is extracted. Works.

The corollary is the ordering rule: dependents to the left, dependencies to the right. If your application uses libA and libA uses libB, write -lA -lB. This also explains a nasty class of latent build bugs — a wrong order works fine while the library is a shared object, because shared objects are not lazily extracted (all their symbols are visible as a unit), and breaks the day someone converts it to a static archive.

--start-group and --end-group exist for the case that ordering cannot solve: a genuine cycle where libA needs libB and libB needs libA. Inside the group, the linker repeatedly re-scans all the enclosed archives until a full pass extracts nothing new. That guarantees convergence regardless of order. The syntax:

  g++ main.o -Wl,--start-group -lA -lB -lC -Wl,--end-group

or the shorthand -( and -).

The cost is real. The manual says using this option has a significant performance cost and it is best to use it only when there are unavoidable circular references. Each iteration re-reads the archive indices, and on a link line with dozens of archives inside a group this becomes visible. Some build systems apply --start-group around every library by default, which makes link errors go away and link time go up; that is a tradeoff to make knowingly, not a default.

The related flag worth mentioning is --whole-archive, which forces every member of an archive to be linked in regardless of whether anything references it. You need it when the value of a static library is in side effects rather than in called functions: static initializers that register a factory, a plugin that self-registers at load, a test framework that discovers tests through global constructors. Without --whole-archive those members are extracted only if something references a symbol inside them, and nothing does, so the registrations silently never happen and the program behaves as if the library were not linked at all. Always pair it with --no-whole-archive afterwards so it does not apply to the rest of the line.`,
      },
      {
        question: 'A binary runs on the build machine and dies at startup on the target with a missing shared library. Walk through the search order and the fix.',
        answer: `The binary does not record paths to its libraries. It records DT_NEEDED entries containing each library's SONAME. At exec time the kernel maps the image, sees PT_INTERP naming the dynamic linker, and hands control to ld.so, which resolves each SONAME against a fixed search order documented in the ld.so manual page:

1. DT_RPATH from the binary, but only if DT_RUNPATH is not present
2. LD_LIBRARY_PATH, unless the process is in secure-execution mode
3. DT_RUNPATH — and only for the objects named in this binary's own DT_NEEDED entries, not for their dependencies
4. /etc/ld.so.cache, unless linked with -z nodefaultlib
5. /lib then /usr/lib (or /lib64 and /usr/lib64), again unless -z nodefaultlib

Three properties of that list cause nearly all the confusion.

First, RPATH and RUNPATH are mutually exclusive in effect. If the binary has a DT_RUNPATH entry, DT_RPATH is ignored entirely, even if both are present. Modern toolchains pass --enable-new-dtags by default, so you get RUNPATH.

Second, their positions relative to LD_LIBRARY_PATH are opposite. RPATH beats the environment variable; RUNPATH loses to it. That is the whole reason RUNPATH was introduced: an operator can override a library at runtime without rebuilding, which RPATH made impossible.

Third, RUNPATH is not transitive. It applies to the direct dependencies of the object that carries it, and not to those objects' own dependencies. So if your executable has a RUNPATH pointing at a private lib directory and libfoo.so found there needs libbar.so from the same directory, libbar will not be found — libfoo needs its own RUNPATH. This is a very common and very confusing failure, and it did not happen in the RPATH era because RPATH did apply down the chain.

Fourth, in secure-execution mode (setuid, setgid, or file capabilities), LD_LIBRARY_PATH, LD_PRELOAD, LD_AUDIT and friends are stripped from the environment. So a wrapper script that sets LD_LIBRARY_PATH stops working the moment the binary is invoked through a setuid path, or through a service manager that scrubs the environment.

The fix, in order of preference:

Use an $ORIGIN-relative RUNPATH so the install tree is relocatable:

  g++ -o app main.o -L./lib -lfoo -Wl,-rpath,'$ORIGIN/../lib' -Wl,--enable-new-dtags

The single quotes matter — $ORIGIN must reach the linker literally, not be expanded by the shell. At load time ld.so substitutes the directory containing the binary. Apply the same to each shared library that has private dependencies, precisely because RUNPATH is not transitive.

Install into a standard directory and run ldconfig so the library lands in /etc/ld.so.cache. Correct for system packages, wrong for a self-contained application bundle.

Use LD_LIBRARY_PATH only for development and debugging, never as a shipping mechanism, for the secure-execution reason above.

Two diagnostic habits worth stating. LD_DEBUG=libs shows the search as it happens, including every directory tried and rejected, and it will answer this question faster than any amount of reasoning. And adding -Wl,--no-undefined (equivalently -z defs) when building shared libraries turns "missing dependency" from a runtime surprise into a link-time error, which is where you want it.`,
      },
      {
        question: 'Why does symbol visibility matter for a C++ shared library, and how would you control the export surface?',
        answer: `On ELF the default is that every non-static symbol in a shared object is exported. For a C library that is a manageable set of functions. For a C++ library it is a disaster, because the compiler emits a symbol for every inline member function that needed an out-of-line copy, every template instantiation, every implicitly generated constructor and destructor, every vtable and typeinfo. A moderately sized C++ library can export tens of thousands of symbols by default when its actual API is a few hundred.

Four concrete costs:

Load time. Every exported symbol lands in .dynsym and participates in the dynamic linker's hash-based lookup. Every dynamic relocation must be resolved by searching the global symbol scope across all loaded objects. Drepper's How To Write Shared Libraries builds its entire argument around this: the cost of loading a shared object is dominated by relocation processing and symbol lookup, and both scale with the number of exported symbols. The GCC manual states the same conclusion more briefly — using visibility control can very substantially improve linking and load times of shared object libraries.

Optimization. A symbol with default visibility can be interposed: another object earlier in the search scope, or LD_PRELOAD, can substitute its own definition. So the compiler cannot inline a call to it across the object boundary, cannot assume a global's value is unchanged across such a call, and must route the call through the PLT. Hidden symbols cannot be interposed, so all of that is available.

ABI surface. Anything you export is something a customer can link against, which means it is something you have implicitly promised not to break. Internal helper classes become permanent obligations.

Symbol clashes. Two libraries in the same process that both export a symbol named Logger::init resolve to whichever loaded first. Neither author intended that.

How to control it. The source-level approach: compile with -fvisibility=hidden so the default flips to local, then mark the public API explicitly. The standard portable macro shape is:

  #if defined _WIN32
  #  define MYLIB_API __declspec(dllexport)
  #else
  #  define MYLIB_API __attribute__((visibility("default")))
  #endif

  class MYLIB_API Widget { ... };
  MYLIB_API int mylib_init(void);

Add -fvisibility-inlines-hidden for C++, which hides the out-of-line copies of inline member functions. That one flag alone often removes the majority of exported symbols. The caveat is that it makes function-pointer identity comparison across object boundaries unreliable for those inlines, which almost no code depends on.

Two C++ specifics you must get right. Exceptions thrown across a shared object boundary need their typeinfo exported, or the catch handler will not match and you get an unexpected terminate. Same for RTTI-based dynamic_cast across the boundary. So exception types and polymorphic base classes intended to cross the boundary must be marked default-visible, class-level.

The link-level alternative is a version script, which controls exports without touching sources:

  MYLIB_1.0 {
    global:
      mylib_*;
      extern "C++" { MyNamespace::*; };
    local:
      *;
  };

Applied with -Wl,--version-script=mylib.map. The local: *; catch-all is the key line: hide everything, then whitelist. This is what glibc and most distribution libraries do, and it has the additional benefit of attaching a version tag to each symbol so you can later add versioned definitions without breaking existing binaries.

Which to choose: version scripts if you want export control decoupled from source and need symbol versioning; visibility attributes if you want the compiler to also get the optimization benefit, since the compiler knows about visibility attributes but does not read your version script. Large projects commonly use both.`,
      },
      {
        question: 'Static library or shared library? Argue both sides for a component you ship to other teams.',
        answer: `Static archive.

At link time the needed members are copied into the consumer's binary. There is no runtime dependency and nothing to find at startup.

Arguments for: deployment is trivial, since the binary is self-contained and cannot fail with a missing or wrong-version library. Startup is faster because there is no relocation processing or symbol lookup for that code. The optimizer sees more — with LTO, cross-library inlining becomes possible in a way it is not across a shared object boundary. And --gc-sections can strip everything the consumer does not call, so a large library can contribute very little to the final binary.

Arguments against: a security fix requires relinking and redeploying every consumer, which for a widely used component means coordinating an org-wide rebuild. Every consumer carries its own copy, so N processes on a host use N copies of the text rather than sharing one mapping. And the sharp edge that catches people: if a static library ends up linked into two different shared objects that are both loaded into one process, each gets its own private copy of the library's globals. Singletons are no longer single, static initializers run twice, and a registry populated through one copy is invisible through the other. This is a genuinely hard bug to diagnose.

Shared object.

Loaded at runtime and referenced by SONAME through a DT_NEEDED entry.

Arguments for: one copy of the code is mapped into every process that uses it. A patched library is picked up by every consumer on the next start with no rebuild — which is the entire reason distributions ship shared libraries. Global state is genuinely global within a process. And it is the only option if you need dlopen-style plugins.

Arguments against: you have now committed to an ABI, and for C++ that commitment is much harder than it sounds — adding a virtual function, adding a data member, changing an inline function's body, or changing a default argument can all break binary compatibility even though the source still compiles. You need SONAME discipline: -Wl,-soname,libfoo.so.1 with a major bump for every ABI break, so old binaries keep loading the old generation. You need export control, because otherwise every internal symbol becomes part of that ABI. You pay relocation and symbol lookup cost at every process start. And you now own a deployment problem: the library must be findable at load, which drags in the whole RPATH/RUNPATH/ld.so.cache question.

How I would actually decide.

If the component is consumed only inside one build tree and shipped as part of one product, static, with LTO, and stop thinking about ABI entirely. That is the common case for internal libraries and it removes a whole category of problems.

If the component is consumed by teams that build and deploy independently, and especially if it needs to be patched without rebuilding consumers, shared — and then do the work that makes shared safe: an explicit SONAME, -fvisibility=hidden with an explicit export macro or a version script, -Wl,--no-undefined so missing dependencies fail at link, a C-compatible or pimpl-based interface so that the fragile parts of the C++ ABI are not exposed, and $ORIGIN-relative RUNPATH so the install tree relocates.

The answer that gets marked down is picking one on general principle. The answer that lands is naming the coupling you are choosing: static couples you to a rebuild cycle, shared couples you to an ABI.`,
      },
      {
        question: 'Link time dominates our edit-test loop. What do you do, and where does LTO fit?',
        answer: `First measure whether it is really link time and not something adjacent. A large fraction of apparent link time on a C++ project with -g is DWARF processing, not symbol resolution. Time a link with and without debug info to find out which problem you have.

Then, roughly in order of effort-to-payoff:

Switch linkers. ld.bfd is single-threaded and by far the slowest option. lld ships with LLVM and is a large improvement; mold is faster still, built around aggressive parallelism, and is the usual choice for link-bound C++ builds. GCC documents -fuse-ld=[bfd|gold|lld|mold|wild] as an explicit option, so this is a one-flag experiment.

  g++ ... -fuse-ld=mold

Gold is the historical middle option and is deprecated upstream, so it is not where new work should go. The main risk with lld and mold is linker script compatibility — if you have a custom script, particularly on embedded targets, verify the output rather than assuming.

Split the debug info. -gsplit-dwarf writes debug data into .dwo files that the linker does not have to read or merge; only a small skeleton stays in the object. On a large C++ project this is often the single biggest link-time win. Pair it with a debug fission-aware debugger and with dwp to package the .dwo files when you want a single artifact.

Drop what is not used. Compile with -ffunction-sections -fdata-sections so each function and object lands in its own section, then link with -Wl,--gc-sections so the linker discards unreferenced ones. Smaller output, less relocation work, and it also shrinks binaries meaningfully.

Reduce the export surface. -fvisibility=hidden and -fvisibility-inlines-hidden mean fewer dynamic symbols to hash, sort, and relocate. This helps link time and load time together.

Prune dependencies. -Wl,--as-needed emits DT_NEEDED only for libraries that actually satisfy an undefined symbol, so you stop dragging in transitive libraries nobody calls.

Now, LTO. -flto changes what the object files contain: instead of final machine code, GCC writes GIMPLE bytecode into ELF sections, and at link time all the function bodies are read back and instantiated as if they had been part of the same translation unit. That enables cross-TU inlining, cross-TU constant propagation, and much more aggressive dead code elimination. The wins on a C++ codebase are real, commonly single-digit to low-double-digit percent on runtime, and larger on binary size when combined with --gc-sections.

The cost is that code generation moves into the link, so link time and link memory both go up substantially — this is exactly the opposite direction from everything above. -flto=auto parallelizes across cores, -flto-partition controls how the work is split, and GCC now offers -flto-incremental with a cache path specifically to shorten edit-compile cycles.

So the answer to "where does LTO fit" is: not in the edit-test loop. The standard arrangement is LTO off for development builds and on for release and benchmark builds. If you do want it everywhere, ThinLTO on the Clang side is the design that makes it tractable, because it keeps per-TU work parallel and only does a cheap global summary pass.

One more thing worth raising unprompted, because it is what actually happens when a team turns LTO on: it will produce diagnostics the normal build never did. Mismatched declarations of the same function in two TUs, and type mismatches reported by -Wodr, are invisible to per-TU compilation and obvious to LTO because it holds everything at once. Teams often read those as LTO being broken. They are pre-existing ODR bugs, and finding them is a benefit, not a regression.`,
      },
    ],
    references: [
      'https://sourceware.org/binutils/docs/ld/Options.html',
      'https://man7.org/linux/man-pages/man8/ld.so.8.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Code-Gen-Options.html',
      'https://www.akkadia.org/drepper/dsohowto.pdf',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. GCC Toolchain Internals
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-gcc-toolchain',
    title: 'GCC Toolchain Internals',
    icon: 'tool',
    color: '#ea580c',
    questions: 5,
    description: 'What the gcc driver actually runs, what each optimization and debug level enables, and the flags that silently change correctness or portability — march=native, -Ofast, -std defaults, and the libstdc++ versus libc++ split.',
    visualizations: [
      {
        title: 'The driver, its subprocesses, and the flags that change semantics',
        image: '/diagrams/devops/nb-3-gcc-toolchain.png',
        description: `gcc is not a compiler. It is a driver: a program that looks at file suffixes, decides which subprocesses to run in which order with which arguments, and runs them. The compiler proper is cc1 for C and cc1plus for C++; the assembler is as from binutils; the linker is invoked through collect2, which wraps ld to handle static constructors on targets that need it.

Seeing the real command line:

  gcc -v hello.c -o hello        # print each subprocess command AND execute it
  gcc -### hello.c -o hello      # print them, quoted, and execute nothing
  gcc -save-temps -c hello.c     # keep hello.i, hello.s, hello.o instead of deleting

-### is the flag to know. It shows you exactly what the driver would run, with every implicit flag the driver injects — the include paths, the target triple, the default library set, the startup files. When a build "works with gcc but not with the same flags passed directly to clang", -### is how you find the flags you did not know were there.

gcc -v with no source file prints the configuration the compiler was built with: the target triple, the configure line, the thread model, and the version. That configure line tells you the default sysroot, the default --with-arch and --with-tune, and whether the compiler was built with a particular default std or ABI.

Spec strings tie it together. The driver's behavior is table-driven by built-in specs, printable with gcc -dumpspecs and overridable with -specs=file. In practice you almost never write a spec file outside of embedded and cross-compilation work, but knowing that the mapping from your flags to subprocess arguments is data rather than code explains why the same flag can behave differently across distributions that patch their specs.

File suffixes drive the phases. .c is preprocessed then compiled; .i is already preprocessed and skips it; .cc, .cpp, .cxx, .C are C++; .s is assembled directly; .S is preprocessed then assembled; .o goes straight to the link. -x lets you override the suffix inference. -E, -S, -c stop after phase 1, 2, and 3 respectively.

Optimization levels, precisely:

-O0 — the default. Most optimization passes are not run even if you explicitly enable them individually. Fastest compiles, best debugging, code that can be several times slower.
-O1 — basic optimizations that do not cost much compile time.
-O2 — nearly all supported optimizations that do not involve a space-speed tradeoff. The production default.
-O3 — adds aggressive transforms: -fgcse-after-reload, -fipa-cp-clone, -floop-interchange, -floop-unroll-and-jam, -fpeel-loops and others. Bigger code; sometimes faster, sometimes slower through instruction cache pressure. Measure.
-Os — most of -O2 minus the passes that grow code, specifically excluding -falign-functions, -falign-jumps, -falign-labels, -falign-loops.
-Oz — optimize aggressively for size, more so than -Os.
-Og — -O1 minus the passes that greatly interfere with debugging. The correct choice for a debug build, not -O0.
-Ofast — -O3 plus -ffast-math, -fallow-store-data-races, -fno-protect-parens, and it turns off -fsemantic-interposition. GCC states outright that it disregards strict standards compliance. -ffast-math alone breaks NaN and infinity handling, breaks the sign of zero, allows reassociation that changes results, and sets a process-wide FTZ/DAZ mode via crtfastmath.o that affects code you did not compile.

Debug levels:

-g0 no debug info. -g1 minimal — enough for backtraces, function descriptions and line numbers, but no local variables. -g2 (the plain -g) adds locals and typedefs. -g3 adds macro definitions so you can expand macros in the debugger. -gdwarf-5 selects the DWARF version; 5 is the default on most targets now. -gsplit-dwarf moves debug data into .dwo files so the linker does not merge it. -grecord-gcc-switches records the compile command in DW_AT_producer, which is the cheapest possible way to answer "what flags was this object built with" six months later.

Target selection:

-march=X sets the instruction set the compiler may emit; the resulting binary may not run at all on anything older. -mtune=X only affects scheduling and cost model and emits nothing outside the base ISA. -march=X implies -mtune=X. -march=native detects the build machine's CPU and enables everything it supports, which is the single most common way to ship a binary that dies with SIGILL on a slightly older host.`,
      },
      {
        title: 'Quick-fire interview answers — GCC toolchain',
        description: `Q: What is the difference between gcc -v and gcc -###?
A: Both print the subprocess command lines the driver will run. -v runs them; -### prints them quoted and runs nothing. -### is the safe way to inspect exactly what flags the driver injects, including the include paths, target triple, and startup files you never typed.

Q: -march versus -mtune?
A: -march sets which instructions the compiler is allowed to emit, so it changes where the binary can run. -mtune only changes scheduling and cost decisions and never emits instructions outside the base architecture, so it is safe. Specifying -march implies the matching -mtune. The portable production combination is a conservative -march with an aggressive -mtune.

Q: Should a debug build use -O0?
A: -Og is usually the better answer. It enables -O1 minus the passes that badly interfere with debugging, so you get code that is several times faster than -O0 while variables and line numbers remain mostly trustworthy. Use -O0 when you need every variable live at every point.

Q: Why is -Ofast dangerous?
A: It enables -ffast-math and -fallow-store-data-races and explicitly disregards strict standards compliance. -ffast-math permits reassociation that changes floating-point results, breaks NaN and infinity handling and signed zero, and links a startup object that sets flush-to-zero mode process-wide — affecting libraries you did not compile. Use -O3 with specific relaxations you can justify instead.

Q: My binary dies with SIGILL on the production host but works in CI. What did I do?
A: Almost certainly -march=native on a build machine newer than the target. The compiler emitted instructions the deployment CPU does not implement, and the illegal instruction fires the first time that code path runs — which may be well after startup, inside a memcpy or a vectorized loop. Replace it with an explicit baseline -march plus -mtune.

Q: GCC compiles it, Clang does not. Why?
A: Common causes are default -std differences between compiler versions, GCC accepting more GNU extensions by default, two-phase name lookup in templates (Clang is stricter about dependent names, so you need this-> or typename), and differing default warning sets so -Werror trips on one and not the other. Building with both in CI is what stops this from becoming a release-day problem.`,
      },
    ],
    introduction: `Most engineers use gcc for years without knowing that gcc is not a compiler. It is a driver. It reads the suffixes of the files you gave it, consults a table of spec strings, and launches subprocesses: the preprocessor, then cc1 or cc1plus for the compilation proper, then as to assemble, then collect2 to drive ld. Two flags expose the whole machine — gcc -v prints and runs each subprocess command, and gcc -### prints them without running anything. Almost every "why is this flag not doing what I expect" question is answered in thirty seconds by -###, because the driver injects a large set of implicit arguments you never typed: include paths, the target triple, startup files, and the default library set.

Optimization levels are the flags people think they understand and usually do not. -O2 performs nearly all supported optimizations that do not involve a space-speed tradeoff, and it is the correct production default. -O3 adds passes that grow code — loop interchange, unroll-and-jam, peeling, IPA constant propagation with cloning — and those can go either way depending on instruction cache pressure, which is why -O3 is a measurement, not an upgrade. -Os is most of -O2 with the code-growing alignment passes removed. -Og is the underused one: -O1 minus the passes that interfere with debugging, which makes it the right choice for a debug build rather than -O0.

-Ofast deserves to be treated as a correctness flag rather than a performance flag. GCC documents it as enabling optimizations that are not valid for all standard-compliant programs, and it turns on -ffast-math and -fallow-store-data-races. -ffast-math alone changes floating-point semantics: NaN and infinity handling, the sign of zero, and the compiler's freedom to reassociate expressions in ways that change results. Worse, on Linux it links a startup object that sets flush-to-zero and denormals-are-zero in the FPU control word for the entire process, so a library compiled with -Ofast silently changes the arithmetic of every other library in the same address space. Numerical code that "works" under -Ofast has usually just not been tested near the edges yet.

Target selection is the other flag family that changes correctness rather than speed. -march tells the compiler which instructions it may emit, so it determines where the binary can run at all. -mtune only affects scheduling and cost modeling and never emits anything outside the base ISA. -march=native reads the build machine's CPU and enables everything it supports — perfect for a benchmark on the machine you are sitting at, catastrophic for a build artifact, because the binary will run fine until the first time it reaches a vectorized loop on an older host and dies with SIGILL. The portable pattern is a conservative baseline -march with an aggressive -mtune, plus runtime dispatch or function multiversioning for the hot paths that genuinely benefit from newer instructions.

Then there are the differences between GCC and Clang that surface as build breaks. Default -std varies by compiler version, so code that compiled as gnu++17 under one and gnu++14 under another behaves differently. Clang enforces two-phase name lookup in templates, so dependent names need this-> or typename in ways GCC historically tolerated. The default warning sets differ, so -Werror that is clean on one compiler fails on the other. And on the library side, libstdc++ and libc++ are distinct implementations with distinct ABIs — you cannot pass a std::string across a boundary where one side used each. Within libstdc++ there is a second axis, _GLIBCXX_USE_CXX11_ABI, which changes std::string's layout and appears in mangled names as __cxx11.

What an interviewer probes here is whether flags are things you reason about or things you copy. The distinguishing questions are: which flags change semantics rather than speed, what would you set for a shipped artifact versus a local benchmark, and how do you find out what the toolchain is actually doing rather than what you assumed.`,
    whenToUse: [
      'Investigating why a build behaves differently on two machines or two distributions with nominally identical flags',
      'Choosing the optimization and debug flag set for a shipped release artifact that must also be debuggable from a production core dump',
      'Deciding how to get vectorization benefit without producing a binary that only runs on the build machine',
      'Introducing -Wall -Wextra -Werror to a codebase that has never had warning discipline, without stopping all other work',
      'Setting up or debugging a cross-compilation or sysroot-based build where the driver is picking up the wrong headers or libraries',
      'Reconciling a codebase that must build cleanly under both GCC and Clang, or that mixes libstdc++ and libc++ consumers',
    ],
    keyConcepts: [
      {
        term: 'The driver and its subprocesses',
        definition: 'gcc and g++ are drivers, not compilers. They infer the language from file suffixes and run cc1 or cc1plus for compilation proper, as for assembly, and collect2 wrapping ld for the link. -v prints and executes each subprocess command; -### prints them quoted without executing; -save-temps keeps the .i and .s intermediates.',
      },
      {
        term: 'Spec strings',
        definition: 'The mapping from your command-line flags to the arguments passed to each subprocess is table-driven data, not hardcoded logic. gcc -dumpspecs prints the built-in table; -specs=file overrides it. This is why the same flag can behave differently on two distributions that patch their specs, and it is the mechanism embedded toolchains use to inject board-specific startup files and linker scripts.',
      },
      {
        term: '-O2 versus -O3',
        definition: '-O2 performs nearly all supported optimizations that do not involve a space-speed tradeoff. -O3 adds passes that trade size for speed — -fgcse-after-reload, -fipa-cp-clone, -floop-interchange, -floop-unroll-and-jam, -fpeel-loops among others. -O3 is not strictly better; the extra code size can cost more in instruction cache misses than the transforms gain.',
      },
      {
        term: '-Og and -Os and -Oz',
        definition: '-Og is -O1 minus the passes known to greatly interfere with debugging, and it is the intended flag for a debug build. -Os is -O2 minus the code-growing alignment passes (-falign-functions, -falign-jumps, -falign-labels, -falign-loops). -Oz optimizes for size more aggressively than -Os.',
      },
      {
        term: '-Ofast and -ffast-math',
        definition: '-Ofast is -O3 plus -ffast-math, -fallow-store-data-races, -fno-protect-parens, with -fsemantic-interposition turned off; GCC documents it as disregarding strict standards compliance. -ffast-math permits reassociation, assumes no NaN or infinity, ignores signed zero, and on Linux links a startup object that sets flush-to-zero for the whole process, affecting code you did not compile.',
      },
      {
        term: '-g levels and DWARF',
        definition: '-g1 gives enough for backtraces (functions and line numbers, no locals); -g2 (plain -g) adds locals and typedefs; -g3 adds macro definitions so the debugger can expand macros. DWARF 5 is the default on most targets, selectable with -gdwarf-N. -gsplit-dwarf writes .dwo files the linker does not have to merge. -grecord-gcc-switches embeds the compile flags in DW_AT_producer.',
      },
      {
        term: '-march versus -mtune',
        definition: '-march=cpu selects the instruction set and may generate code that will not run at all on other processors. -mtune=cpu only affects scheduling and cost heuristics and never emits instructions outside the default machine type. -march implies -mtune. -march=native picks the build machine\'s CPU and enables every subset it supports, which makes the result non-portable by construction.',
      },
      {
        term: 'libstdc++ versus libc++ and the CXX11 ABI',
        definition: 'libstdc++ (GNU) and libc++ (LLVM) are separate implementations with incompatible ABIs; standard library types cannot cross a boundary where the two sides used different ones. Within libstdc++, _GLIBCXX_USE_CXX11_ABI selects between the old copy-on-write std::string and the C++11-conforming one, changing the layout and the mangled names — the tell is __cxx11 appearing in an undefined reference.',
      },
    ],
    approach: [
      'Start every toolchain investigation with gcc -v (no source file) to see the target triple, configure line, and version, then gcc -### on the failing command to see the real subprocess arguments including the ones the driver injected',
      'Pick the release flag set deliberately: -O2 as the baseline, -g so production cores are debuggable, and -gsplit-dwarf or separate debug files so the shipped binary stays small',
      'Treat -O3 and any -ffast-math relaxation as an experiment with a benchmark attached, never as a default, and never enable -Ofast wholesale on a library other people link into',
      'Set a conservative baseline -march that matches your oldest supported deployment CPU, pair it with an aggressive -mtune, and use runtime dispatch or target attributes for the specific hot functions that justify newer instructions',
      'Adopt warnings incrementally: turn on -Wall -Wextra project-wide as non-fatal first, get the count to zero file by file, and only then add -Werror so the ratchet cannot slip backward',
      'Build in CI with both GCC and Clang from the start, since the second compiler is the cheapest available detector of undefined behavior, non-portable extensions, and sloppy template code',
      'Pin the standard explicitly with -std= rather than relying on a compiler default that changes between versions, and pin the standard library ABI flags in one shared place so no target can disagree',
    ],
    pitfalls: [
      'Shipping a binary built with -march=native, which runs on the build host and faults with SIGILL on any older CPU, often deep in a vectorized loop long after startup rather than at load',
      'Enabling -Ofast on a numerical library, which links crtfastmath.o and sets flush-to-zero process-wide, silently changing the results of every other library in the same process',
      'Stripping all debug info from release builds to save space, then being unable to symbolize a production core dump — the right answer is -g with split or separated debug files, not -g0',
      'Adding -Werror to a codebase with thousands of existing warnings by also adding a wall of -Wno- suppressions, which permanently disables the warnings you most needed',
      'Assuming -O2 and -O3 produce identical behavior, then discovering that the extra inlining and loop transforms exposed latent undefined behavior — strict aliasing violations and signed overflow are the usual culprits, findable with -fno-strict-aliasing as a diagnostic and -fsanitize=undefined as the real fix',
      'Mixing objects built against libstdc++ and libc++, or against different _GLIBCXX_USE_CXX11_ABI settings, and reading the resulting __cxx11 undefined references as a link-order problem',
    ],
    keyQuestions: [
      {
        question: 'Explain what actually happens when you type g++ -O2 -g main.cpp -o app, and how you would inspect it.',
        answer: `The g++ binary you invoked is a driver. It does no compiling itself. Its job is to classify inputs, consult its spec tables, and launch subprocesses.

Classification. main.cpp has a C++ suffix, so the driver knows it needs preprocessing, then compilation, then assembly. The absence of -c or -S means it also needs linking. -o app names the final output.

Subprocess 1 — cc1plus. On modern GCC the preprocessor is integrated into the compiler proper, so the driver runs cc1plus once with the preprocessing and compilation both handled internally. It passes a large set of arguments you did not type: the include search paths derived from the install prefix and any sysroot, the target triple, the default -std for this compiler version, and the optimization and debug flags you did specify. Output is assembly in a temporary file.

Subprocess 2 — as. The assembler turns that into a relocatable ELF object, also in a temporary file.

Subprocess 3 — collect2, which invokes ld. collect2 is a wrapper that historically existed to gather static constructors on targets whose linkers could not do it; it is still in the chain. It passes the C runtime startup objects (crt1.o, crti.o, crtbegin.o and their counterparts), the library search paths, the default library set (-lstdc++, -lm, -lgcc, -lgcc_s, -lc), and the dynamic linker path.

Then the temporaries are deleted, which is why you never see them.

How to inspect it:

  g++ -### -O2 -g main.cpp -o app

This prints every subprocess command, fully quoted, and executes nothing. This is the flag to reach for. It exposes the entire injected argument set — the exact include paths, the exact library list, the exact target triple. When someone says "we pass the same flags to clang and it behaves differently", the difference is almost always in this injected set, and -### is where you find it.

  g++ -v -O2 -g main.cpp -o app

Same information, but it also runs the commands, and it additionally prints the include search path in the order actually searched, which is the fastest way to diagnose a wrong-header problem.

  g++ -save-temps -c main.cpp

Keeps main.ii and main.s instead of deleting them. Reading main.ii tells you what the preprocessor produced; reading main.s tells you whether the vectorization you expected actually happened.

  g++ -v

With no input file at all, this prints the compiler's own configuration: version, target triple, thread model, and the full configure command line the compiler was built with. That configure line contains the defaults — --with-arch, --with-tune, --with-sysroot, whether it was built with a non-default standard — and it is the authoritative answer to "why does this machine's gcc behave differently".

  gcc -dumpspecs

Prints the spec strings, the data table mapping flags to subprocess arguments. You will rarely need this outside embedded or cross-compilation work, but it is worth knowing that the driver's behavior is data rather than code, because that is why distributions can and do patch defaults into their compilers without changing any source you can see.

The point to make in an interview is the mental model: the driver is a process launcher, everything it does is inspectable, and -### is how you inspect it. Engineers who guess at flag behavior have not internalized that.`,
      },
      {
        question: 'What flags would you set for a shipped release build, and which flags would you refuse to set?',
        answer: `The set I would ship:

-O2. It performs nearly all supported optimizations that do not involve a space-speed tradeoff, which is the right default because it is the configuration that gets the overwhelming majority of real-world testing across every project on the planet. -O3 is a per-workload experiment, not an upgrade — its extra passes (-floop-interchange, -floop-unroll-and-jam, -fpeel-loops, -fipa-cp-clone) grow code, and on a branchy service the resulting instruction cache pressure often costs more than the transforms gain. If a hot path benefits, apply -O3 or a target attribute to that translation unit and prove it with a benchmark.

-g. Yes, in the release build. Debug info does not change generated code; it changes what is recorded alongside it. Shipping without it means the first production core dump is unsymbolizable and you are reading raw addresses. Keep the artifact small by separating rather than deleting: build with -g, then split the debug info into a companion file and strip the shipped binary, or use -gsplit-dwarf so the debug data never enters the link in the first place. Archive the debug file next to the release artifact so it can be paired later.

-grecord-gcc-switches. Records the exact compile flags in DW_AT_producer. This costs nothing and answers "what was this built with" six months later, from the binary itself, when the CI logs are long gone.

A conservative -march plus an aggressive -mtune. -march determines where the binary can run at all; -mtune only affects scheduling and never emits instructions outside the base machine. So set -march to the oldest CPU generation you support and -mtune to what you actually deploy on.

-Wall -Wextra -Werror, assuming the codebase already sustains it. Hardening flags as appropriate for the platform: -fstack-protector-strong, -D_FORTIFY_SOURCE=2 with an optimization level (it does nothing at -O0), -fPIE with -pie, and -Wl,-z,relro,-z,now.

An explicit -std=. Never rely on the compiler default, which varies by GCC version and silently changes the language your code is compiled as when someone upgrades the toolchain image.

What I would refuse:

-Ofast. GCC documents it as disregarding strict standards compliance. It enables -ffast-math and -fallow-store-data-races. -ffast-math permits reassociation that changes floating-point results, assumes NaN and infinity never occur, and ignores the sign of zero — so any code that checks isnan, relies on signed zero, or does compensated summation is quietly broken. Worse, on Linux it causes crtfastmath.o to be linked, which sets flush-to-zero and denormals-are-zero in the FPU control register for the entire process. A library built with -Ofast therefore changes the arithmetic of every other library in the same address space, including ones the author never saw. If a specific relaxation is genuinely justified, enable that one flag on that one translation unit, with a comment explaining why, and never at the library level.

-march=native. It reads the build machine's CPU and enables everything it supports, so the binary is portable to exactly one class of machine — the one that built it. In CI on a modern runner, deploying to an older fleet, this produces a SIGILL that fires the first time execution reaches a function using an unsupported instruction. That may be minutes into the process lifetime, in a vectorized memcpy or a hot loop, which makes it look like a random crash rather than a build configuration error.

-fno-strict-aliasing as a permanent setting. It is an excellent diagnostic — if a bug disappears under it, you have a strict aliasing violation — but leaving it on permanently means you are shipping known undefined behavior with the optimizer restrained rather than fixing it.

-w or a wall of -Wno- suppressions. Silencing the diagnostic does not remove the defect.`,
      },
      {
        question: 'You want AVX-512 performance but the fleet is heterogeneous. How do you get it without shipping a binary that crashes?',
        answer: `The failure mode first, because naming it precisely is half the answer. -march sets which instructions the compiler may emit. -march=native enables every subset the build machine supports. The compiler then freely emits those instructions anywhere, including in code paths that have nothing to do with your hot loop, because it also affects how the compiler implements ordinary things like struct copies. On a CPU that does not implement them the result is SIGILL, and it fires the first time execution reaches that instruction, which can be well into the process lifetime. It is not a load-time failure, which is why it does not look like a build problem.

The correct structure is a portable baseline plus targeted opt-in for the hot code.

Baseline. Set -march to the oldest microarchitecture you support. On x86-64 the psABI levels are a clean vocabulary for this: x86-64 is the original baseline, x86-64-v2 adds SSE4.2 and popcnt, x86-64-v3 adds AVX2, FMA and BMI, x86-64-v4 adds AVX-512. GCC accepts these directly as -march=x86-64-v3, which is far more meaningful in a build file than naming a specific CPU. Pair it with -mtune=generic, or -mtune set to the CPU that dominates your fleet, since -mtune only affects scheduling and cost heuristics and never emits instructions outside the base ISA.

Then opt in for the parts that matter, using one of three mechanisms.

Target attributes on individual functions. Mark a function with __attribute__((target("avx512f"))) and the compiler is allowed to use those instructions in that function only. You then guard the call site with a runtime CPU check — __builtin_cpu_supports("avx512f") on GCC — so the function is never entered on a machine that cannot run it.

Function multiversioning. GCC supports __attribute__((target_clones("default","avx2","avx512f"))) on a function; the compiler generates one body per listed target and emits an IFUNC resolver that selects the right one at load time based on the actual CPU. This is the lowest-effort option because the dispatch is generated for you and the call sites do not change.

Separate translation units. Compile the vectorized kernels into their own .cpp files with their own -march, keep everything else at baseline, and dispatch to the right kernel through a function pointer initialized once at startup after a CPUID check. This is what performance libraries do, because it gives the compiler a whole file to work with rather than one function, and because it isolates the risk to files you can audit.

Two things to verify rather than assume. First, that the guard is actually correct — a common bug is checking for AVX-512 support in the CPU while the OS has not enabled the extended state, which is why the check should use the compiler builtin or a proper XGETBV-aware library rather than raw CPUID feature bits. Second, that AVX-512 is actually a win on your target: on several Intel generations, sustained 512-bit operation triggers frequency reduction that makes the surrounding scalar code slower, so the correct answer for some workloads is 256-bit AVX2 with -mprefer-vector-width=256 even on hardware that supports 512.

And whatever you choose, make it verifiable. A CI check that the shipped binary contains no instructions above the declared baseline is cheap and catches the day someone adds -march=native to a Makefile because it made their local benchmark faster.`,
      },
      {
        question: 'A team wants to turn on -Wall -Wextra -Werror on a ten-year-old codebase. How do you do it without stopping all other work?',
        answer: `The reason this is a hard question is that the naive approach — flip all three flags, see 8,000 warnings, then add -Wno- for every category that appears — is worse than doing nothing. You end up having permanently disabled exactly the diagnostics that had the most findings, which are the ones most likely to be real bugs.

What the flags actually are. -Wall is not all warnings; it is the set the GCC maintainers consider both useful and low-false-positive. -Wextra adds a second tier with more false positives. Neither is fatal by itself. -Werror promotes every warning to an error, which is the ratchet: once you are at zero, nothing can add a new one.

The staged approach:

Stage 1 — measure. Turn on -Wall -Wextra with no -Werror, build, and capture the warning list grouped by category and by file. You now have data instead of a feeling. Typically a handful of categories account for most of the count, and they are usually the boring ones: unused parameters, sign comparison, missing field initializers.

Stage 2 — triage by category, not by count. Some warnings are almost always real defects and should be fixed first regardless of how many there are: -Wreturn-type (falling off the end of a non-void function is undefined behavior), -Wuninitialized and -Wmaybe-uninitialized, -Wformat mismatches, -Wsign-compare in index arithmetic. Others are mostly noise in old code: -Wunused-parameter in virtual overrides, -Wmissing-field-initializers in aggregate initialization. Fix the first group as bugs. For the second, decide whether the diagnostic earns its keep in this codebase at all — that is a legitimate reason to not enable a specific warning, and it is different from suppressing it after the fact.

Stage 3 — ratchet per directory or per target, not globally. Add -Werror to the build settings of one clean subdirectory or one library target at a time. New code lands in ratcheted areas and cannot regress; old code gets migrated on a schedule. This is the mechanism that lets the work proceed in parallel with feature development, and it is the answer the question is really looking for.

Stage 4 — make new code clean by construction. Warnings in changed lines only, enforced in the PR check, means the codebase converges without a big-bang cleanup. Several teams do this with a diff-aware warning filter rather than a compiler flag.

Stage 5 — add the second compiler. Building with Clang as well as GCC roughly doubles the diagnostic coverage for free, because the two have substantially different warning implementations and Clang has several GCC lacks. This is also where you find non-portable GNU extensions and template code that only worked because GCC was lenient about two-phase name lookup.

The cost of enabling late, which is the second half of the question: it is not the fixing, it is that ten years of real defects have been sitting in the output unread, and separating those from the noise takes judgment rather than mechanical work. There is also a version-skew cost — new GCC releases add new warnings, so a codebase with -Werror can fail to build on a newer compiler through no change of its own. The standard mitigation is to keep -Werror on in CI where the compiler version is pinned, and off in developer and downstream builds, commonly via a build option that defaults to on only in CI. Shipping a library whose build hard-fails on any future compiler is a real burden on your consumers.`,
      },
      {
        question: 'What GCC versus Clang differences have actually bitten you, and how do you keep a codebase building on both?',
        answer: `The differences that cause real incidents cluster into four areas.

Language defaults. The default -std differs across compiler versions and across the two compilers at any given moment. Code that compiled as gnu++14 under one toolchain and gnu++17 under another gets different overload resolution, different lifetime rules for temporaries in range-for, and different constexpr rules. GCC also enables more GNU extensions by default than Clang does in some configurations. The fix is unconditional: set -std= explicitly in the build, never rely on a default.

Two-phase name lookup in templates. This is the single most common source of "GCC compiles it, Clang does not". In a class template deriving from a dependent base, a reference to an inherited member must be qualified — this->member or Base<T>::member — because at first-phase parsing the compiler does not know the base's contents. Dependent type names need typename, dependent templates need the template disambiguator. Clang enforces this strictly; GCC historically was more forgiving in places. Code written and only ever compiled with GCC accumulates these, and porting to Clang surfaces them all at once. Note this is not a Clang bug — Clang is the one following the standard.

Diagnostics and -Werror interaction. The two compilers have different warning sets and different heuristics inside the same-named warning. -Wmaybe-uninitialized in particular is famously noisy and version-dependent in GCC. A codebase that is warning-clean under GCC with -Werror will not be under Clang, and vice versa. Treat the warning configuration as per-compiler rather than shared.

Standard library ABI. libstdc++ and libc++ are separate implementations with incompatible ABIs. You cannot pass a std::string, std::vector, or any standard library type across a boundary where one side was built against each — the layouts differ and the mangled names differ. Note that this is orthogonal to the compiler choice: Clang links libstdc++ by default on Linux and libc++ only with -stdlib=libc++. Inside libstdc++ there is a second axis, _GLIBCXX_USE_CXX11_ABI, choosing between the old copy-on-write std::string and the conforming C++11 one; the mismatch surfaces as an undefined reference with __cxx11 in the name, which is a much better outcome than silent corruption but still costs an afternoon the first time you see it.

Beyond those, smaller items worth knowing: inline assembly constraint handling differs in places; some GCC builtins have no Clang equivalent and vice versa; the compilers disagree about what constitutes a valid constant expression in a handful of corners; and pragma diagnostic push/pop is spelled the same but the warning names inside differ.

How to keep both working. Build both in CI from day one — not as a portability exercise but because the second compiler is the cheapest undefined-behavior detector available. If a construct is accepted by one and rejected by the other, the resolution is almost always that the code was relying on non-standard behavior. Pin -std explicitly. Keep the warning configuration per-compiler rather than trying to find a common subset. Pick one standard library per deployment target and enforce it in one place rather than per-target. Run the sanitizers under Clang, since ASan, UBSan and TSan are generally more mature there, while keeping GCC as the production compiler if that is what you ship — the two roles do not have to be the same compiler.

The retrofit is where the pain is. Adding the second compiler to a mature single-compiler codebase produces a large one-time batch of template qualification fixes and warning cleanup. Adding it on day one costs almost nothing.`,
      },
    ],
    references: [
      'https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Debugging-Options.html',
      'https://gcc.gnu.org/onlinedocs/gcc/x86-Options.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html',
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // 4. GCC Upgrades and ABI Migration
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-gcc-upgrades',
    title: 'GCC Upgrades and ABI Migration',
    icon: 'trendUp',
    color: '#ea580c',
    questions: 6,
    description: 'Why moving a fleet from GCC 9 to GCC 14 is a platform migration and not a version bump: the libstdc++ dual ABI, warnings promoted to errors, changed language defaults, and a staged rollout that does not strand production.',
    visualizations: [
      {
        title: 'The five things that change when you change the compiler',
        image: '/diagrams/devops/nb-4-gcc-upgrades.png',
        description: `A GCC upgrade is five independent changes wearing a single version number. Teams that plan it as one change stall for months, because every failure looks like every other failure. Separate the layers and each one becomes a bounded, testable task.

Layer 1 — the default language standard.
  GCC 6 moved C++ from gnu++98 to gnu++14. GCC 11 moved it to gnu++17.
  GCC 15 moved C from gnu17 to gnu23. Under C23, bool, true, false, nullptr and
  thread_local become reserved keywords, and a declaration of the form
  rettype identifier(); now means "takes no arguments" instead of "unspecified".
  Mitigation: pin -std= explicitly in the build system BEFORE you touch the
  compiler, and land that as its own commit. A pinned standard turns a
  five-variable experiment into a four-variable one.

Layer 2 — diagnostics promoted to hard errors.
  GCC 14 turned six long-tolerated C behaviours into errors by default:
    -Werror=implicit-function-declaration
    -Werror=implicit-int
    -Werror=int-conversion
    -Werror=incompatible-pointer-types
    -Werror=return-mismatch
    -Werror=declaration-missing-parameter-type
  None of these are new analyses. They are twenty-year-old warnings that finally
  bite. A repo that has been building with -w, or without -Werror, carries an
  unknown quantity of this debt. You cannot estimate it. You measure it by
  building with the new compiler and counting.
  Separately, libstdc++ headers keep shedding transitive includes: GCC 14 broke
  code relying on <algorithm> and <cstdint> arriving for free; GCC 15 did the
  same for <stdint.h>, <cstdint> and <ostream>. Those failures look alarming and
  are trivial: add the include.

Layer 3 — the libstdc++ dual ABI.
  GCC 5.1 introduced conforming C++11 implementations of std::string and
  std::list, which required changing their layout. Rather than break every
  existing binary, libstdc++ ships both. The new implementations live in the
  inline namespace std::__cxx11, so they mangle differently and can coexist in
  one libstdc++.so.6. The macro _GLIBCXX_USE_CXX11_ABI selects which one your
  headers declare: 1 is the new ABI, 0 the old. Some distributions still ship a
  default of 0.
  The choice is independent of -std. C++03 and C++17 translation units link
  together fine as long as they agree on the ABI macro.
  When they disagree you get an undefined reference naming std::__cxx11 or a
  symbol carrying an [abi:cxx11] tag. That is the entire failure mode, and it is
  the single most common GCC-upgrade support ticket in existence.
  Note the asymmetric case: std::ios_base::failure changed base class from
  std::exception to std::system_error and is defined only once, so its layout
  simply changed. There is no dual version to fall back on.

Layer 4 — codegen and undefined behavior.
  Newer GCC optimizes harder. Code that has "worked" for a decade because the
  compiler was not clever enough to exploit its undefined behavior starts
  misbehaving at -O2. The usual suspects are strict aliasing (type punning
  through casts), signed integer overflow assumed not to happen, reading past
  the end of a struct, and use-after-scope on a temporary. These do not produce
  diagnostics. They produce wrong answers in production.
  Triage tools: -fsanitize=undefined and -fsanitize=address on the test suite
  under the NEW compiler, plus -fno-strict-aliasing and -fwrapv as temporary
  escape hatches while you fix the source. Shipping with those flags forever is
  a decision, not an accident — write it down.

Layer 5 — the runtime floor.
  A newer GCC links against newer libstdc++ symbol version nodes. GCC 13.1 uses
  GLIBCXX_3.4.31, GCC 14.1 uses GLIBCXX_3.4.33 and libstdc++.so.6.0.33. The
  soname stays libstdc++.so.6, so the binary loads on an older host and then
  fails at symbol resolution. Building on a newer machine than you deploy to
  raises the floor silently.

How the layers interact is what interviewers probe. A build failure in layer 2
is loud and cheap. A layer 3 mismatch is a link error that points at the wrong
place. A layer 4 regression passes CI and fails at 3am. A layer 5 problem never
reproduces on a developer laptop. Plan the rollout in that order of difficulty,
not in the order the errors happen to appear.`,
      },
      {
        title: 'Quick-fire interview answers — GCC upgrades',
        description: `Q: What is the libstdc++ dual ABI and why does it exist?
A: GCC 5.1 needed to change the layout of std::string and std::list to conform to C++11, which is an ABI break. Instead of breaking every existing binary, libstdc++ ships both implementations: the conforming ones live in the inline namespace std::__cxx11 so they mangle to different symbols. The macro _GLIBCXX_USE_CXX11_ABI picks which set your headers declare, 1 for new and 0 for old, independently of the -std you compile with.

Q: You get "undefined reference to foo(std::__cxx11::basic_string...)". What happened?
A: Two translation units or a prebuilt library disagree on _GLIBCXX_USE_CXX11_ABI. The caller was compiled with the new ABI and the definition it wants was compiled with the old one, or the reverse. Fix by rebuilding everything with one setting, or by compiling your code with -D_GLIBCXX_USE_CXX11_ABI=0 to match a vendor binary you cannot rebuild.

Q: Is a GCC upgrade an ABI break by itself?
A: Not usually. The libstdc++ ABI policy allows adding exported symbols and new instantiations within libstdc++.so.6, so objects built with different recent GCC versions generally link together. What is NOT allowed without a soname bump is changing the size, alignment or layout of an exported type, changing mangling, or removing symbols. The famous exception is the GCC 5 dual ABI, which was handled by adding a parallel namespace rather than bumping the soname.

Q: How do you stage -Werror when the new compiler produces thousands of new warnings?
A: Never flip global -Werror on upgrade day. Snapshot the warning set, then enable -Werror only for the specific diagnostics that are already at zero, one flag at a time: -Werror=return-type, then -Werror=implicit-function-declaration, and so on. Add a CI job that fails when the total warning count increases, so the debt stops growing while you burn it down.

Q: How do you validate that an upgraded shared library is still ABI-compatible for downstream consumers?
A: Build the library with both toolchains and run abidiff (libabigail) on the two .so files. Its exit status is a bit field: 4 means the ABIs differ, 8 means the difference is incompatible. Gate the release on bit 8 being clear. abi-compliance-checker gives a similar report with HTML output; abipkgdiff does it at the package level.

Q: What do you do about a performance regression that only appears after the upgrade?
A: Treat it as a benchmark bisect, not a compiler bug, until proven otherwise. Run the same benchmark binary set with old and new toolchains at identical flags, confirm the regression is real and outside noise, then narrow by optimization level and by individual -f flags before ever suspecting a miscompile. Most "GCC 14 made us slower" reports turn out to be a changed inlining threshold or a vectorization decision that a -fno- flag or a targeted attribute fixes.`,
      },
    ],
    introduction: `The job description line reads "manage and upgrade GCC compiler toolchains, ensuring compatibility and optimal performance across platforms." That sentence describes a platform migration, not a package update. In a large C++ estate the compiler is the single most load-bearing dependency: every binary, every static library, every vendor .so and every container image encodes assumptions about it.

The reason upgrades are hard is that a GCC version number bundles at least five unrelated changes. The default language standard moves. Warnings become errors. The standard library ABI may shift. The optimizer gets more aggressive and starts exploiting undefined behavior that was previously harmless. And the binary you produce acquires a higher minimum runtime version. Each of those has a different owner, a different failure signature, and a different fix.

The libstdc++ dual ABI is the piece most interviewers use as a filter. In GCC 5.1 the C++11 conformance requirements forced a layout change to std::string and std::list. Rather than bump the libstdc++ soname and orphan every existing binary on the planet, the libstdc++ maintainers put the new implementations in an inline namespace, std::__cxx11, and let both live in the same libstdc++.so.6. The preprocessor macro _GLIBCXX_USE_CXX11_ABI, not -std, selects which one your headers declare. Every "undefined reference to something involving __cxx11" ticket since 2015 traces to two objects disagreeing about that macro.

Above the ABI question sits the compatibility question. libstdc++ has a published ABI policy: adding exported functions, data members and instantiations is a minor version bump; changing the size, alignment or layout of an exported type, changing mangling, or removing symbols is a major bump. This is why mixing translation units built with GCC 11 and GCC 13 generally works, and why "just rebuild everything" is nonetheless the only answer you should give for code you control.

The operational half of the job is running two toolchains at once for long enough that nobody has to choose between shipping and upgrading. Red Hat gcc-toolset and its devtoolset ancestor exist precisely for this: a modern GCC installed alongside the system compiler, activated per shell, that statically links the newer C++ runtime bits so the resulting binaries still depend only on the base system libstdc++.so.6. Nix, Spack, Conan profiles and plain per-toolchain container images all solve the same problem differently. The requirement is the same in every case: CC, CXX and the sysroot must be explicit inputs to the build, never inherited from whatever is on PATH.

What an interviewer probes is whether you have actually done this or only read about it. They will ask what a __cxx11 link error means, how you would stage -Werror across three hundred repositories, how you bisect a regression that only reproduces at -O2, and how you prove to a downstream team that your rebuilt library is still ABI-compatible. Vague answers about "testing thoroughly" fail. Concrete answers naming _GLIBCXX_USE_CXX11_ABI, abidiff exit codes, canary targets and a dual-build window pass.`,
    whenToUse: [
      'Moving a C++ estate off an end-of-life distribution where the system GCC is 4.8 or 7 and the dual ABI boundary must be crossed',
      'Adopting a language feature (C++20 modules, coroutines, std::format) that the current toolchain cannot compile',
      'Chasing a security or correctness fix that only exists in a newer GCC or newer libstdc++',
      'Consolidating build farms that have drifted onto three different compiler versions with no pinning',
      'Qualifying a new target architecture where only the newer toolchain has a working backend',
      'Responding to a vendor who ships prebuilt binaries against a different libstdc++ ABI than yours',
    ],
    keyConcepts: [
      {
        term: 'Dual ABI (_GLIBCXX_USE_CXX11_ABI)',
        definition: 'A preprocessor macro that selects which std::string and std::list implementation the libstdc++ headers declare. 1 selects the conforming C++11 versions in the std::__cxx11 inline namespace, 0 selects the pre-GCC-5 versions. Both live in the same libstdc++.so.6. The choice is independent of the -std option, so C++03 and C++20 objects link together as long as the macro agrees.',
      },
      {
        term: 'std::__cxx11 and abi_tag',
        definition: 'The inline namespace holding the new-ABI types, which gives them distinct mangled names such as std::__cxx11::basic_string. Functions whose return type or parameters involve those types carry the abi_tag attribute and appear in diagnostics as [abi:cxx11]. Compile with -Wabi-tag to be warned when your own interfaces accidentally acquire the tag.',
      },
      {
        term: 'GLIBCXX_3.4.x version node',
        definition: 'A symbol version node in libstdc++.so.6. Each GCC release adds a node for the symbols it introduces: GCC 13.1 tops out at GLIBCXX_3.4.31, GCC 14.1 at GLIBCXX_3.4.33. The soname never changes, so an old host loads the binary and then fails at symbol resolution rather than at load. This is how a build machine newer than the deploy target silently raises the runtime floor.',
      },
      {
        term: 'Warnings promoted to errors',
        definition: 'GCC 14 turned implicit-function-declaration, implicit-int, int-conversion, incompatible-pointer-types, return-mismatch and declaration-missing-parameter-type into errors by default for C. They can be demoted individually with -Wno-error=<name> or -fpermissive-style flags, which is the correct short-term move while the real fixes land.',
      },
      {
        term: 'Side-by-side toolchains',
        definition: 'Running old and new GCC concurrently instead of replacing one with the other. Red Hat gcc-toolset-N, Nix, Spack, Conan profiles and per-toolchain container images all do this. The invariant is that CC, CXX, the sysroot and the linker are explicit build inputs, so a build is reproducible without knowing what is on PATH.',
      },
      {
        term: 'abidiff and abi-compliance-checker',
        definition: 'Tools that compare the ABI of two ELF shared libraries using DWARF debug info. abidiff returns a bit field: 4 means the ABIs differ, 8 means the difference is incompatible (a symbol was removed, or a vtable index shifted). Gating a release on bit 8 turns "we think it is compatible" into a mechanical check. abipkgdiff does the same across whole packages.',
      },
      {
        term: 'Canary target',
        definition: 'One real, non-trivial, well-tested service chosen to build and run on the new toolchain first, ahead of the fleet. It must have real traffic and real benchmarks, because the point is to surface layer-4 codegen and layer-5 runtime-floor problems that no amount of compiling can find.',
      },
      {
        term: 'Dual-build window',
        definition: 'The period during which CI builds every artifact with both toolchains and both must pass. It is expensive and finite by design: it prevents new code from being written that only compiles under one compiler, and it ends at cutover, when the old toolchain becomes advisory and then is deleted.',
      },
    ],
    approach: [
      'Freeze the variables you can freeze first: pin -std= explicitly, pin _GLIBCXX_USE_CXX11_ABI explicitly, and pin the compiler version in the build system rather than inheriting whatever PATH offers. Land each as its own commit under the OLD compiler',
      'Install the new toolchain side by side (gcc-toolset, Nix, Spack, or a parallel container image) and produce a full build with it in a scratch pipeline that is allowed to fail. Count the errors and warnings — that count is the actual project estimate',
      'Fix in layers: missing includes and hard errors first, then the promoted-to-error C diagnostics one flag at a time, then dual-ABI link failures, then vendor binaries you cannot rebuild',
      'Run the full test suite built with the new compiler under -fsanitize=address and -fsanitize=undefined to flush out the undefined behavior that the older optimizer was hiding, before you trust any performance number',
      'Benchmark old versus new at identical flags on identical hardware. Investigate regressions by optimization level and individual -f flags before suspecting a miscompile, and record any escape-hatch flags (-fno-strict-aliasing, -fwrapv) as explicit decisions',
      'For every shared library with external consumers, run abidiff between the old-toolchain and new-toolchain builds and treat an incompatible result as a release blocker, not a note',
      'Roll out through a canary target with real traffic, then a dual-build window where CI builds both ways, then cutover, then a scheduled removal of the old toolchain so the dual-build cost actually ends',
    ],
    pitfalls: [
      'Upgrading the compiler and the -std flag in the same change, so every failure has two possible causes and bisection tells you nothing',
      'Turning on global -Werror the day the new compiler lands, which converts a manageable warning backlog into a total build outage and gets the whole upgrade reverted',
      'Rebuilding your own code but not the vendor .so files it links against, then spending days on __cxx11 undefined references that are really an unrebuilt third-party binary',
      'Building on a newer host than you deploy to, which raises the GLIBCXX and GLIBC version floor invisibly — it links, it passes CI, and it fails at symbol resolution on the oldest production host',
      'Declaring victory when it compiles. Layer-4 undefined-behavior regressions compile perfectly and fail under load weeks later; sanitizer runs and a canary with real traffic are the only things that catch them',
      'Leaving -fno-strict-aliasing or -fwrapv in the build permanently as an undocumented workaround, so the real defect is preserved and the next upgrade inherits it',
    ],
    keyQuestions: [
      {
        question: 'A build fails with: undefined reference to `foo(std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> > const&)`. Explain exactly what happened and give three ways to fix it.',
        answer: `What happened: two pieces of the link disagree about _GLIBCXX_USE_CXX11_ABI.

The mechanism. GCC 5.1 had to change the layout of std::string to conform to C++11 (the old implementation was copy-on-write, which C++11 forbids). Changing the layout of a type that appears in thousands of shipped binaries is an ABI break, so libstdc++ took a different route: it defines the conforming implementation inside the inline namespace std::__cxx11 and keeps the old one in std directly. Both are present in the same libstdc++.so.6. Because the namespace is part of the mangled name, the two versions of a function taking std::string are different symbols and can coexist.

The macro _GLIBCXX_USE_CXX11_ABI decides which one your headers declare. Value 1 is the new ABI, value 0 the old. Most modern distributions default to 1; some still default to 0.

So this error means the calling translation unit was compiled with _GLIBCXX_USE_CXX11_ABI=1 and is looking for the __cxx11 symbol, while the object or library that defines foo was compiled with 0 and provides the untagged symbol. It happens in the other direction just as often, and the diagnostic then names the plain std::basic_string form instead.

Confirming it takes one command:

    nm -C --defined-only libvendor.so | grep -c __cxx11

If the count is zero and your own objects are full of __cxx11 symbols, that is the answer. objdump -T works the same way for a dynamic symbol table.

Three fixes, in order of preference.

1. Rebuild everything with one setting. This is the only correct long-term answer for code you own. Set the macro once in the build system, not per-target, and make it a compile definition that propagates to every target. In CMake this is a single add_compile_definitions on the top-level project.

2. Compile your code to match the binary you cannot rebuild. If a vendor ships an old-ABI .so with no source, build your side with -D_GLIBCXX_USE_CXX11_ABI=0. This works, but it is contagious: everything that links with your objects now inherits the constraint, and you lose the features that only exist under the new ABI. libstdc++ documents that under the old ABI you give up constexpr std::string, allocator propagation for strings, the const_iterator positional overloads, std::chrono::time_zone and the entire <syncstream> header.

3. Isolate the vendor library behind a C boundary. Wrap it in a small shared object built with the vendor ABI setting, exporting only extern "C" functions that take const char* and length rather than std::string. Your main build then uses whatever ABI it wants. This is the right answer when the vendor library is small, the interface is narrow, and you expect to be stuck with it for years.

Two things not to do. Do not mix the settings within one binary and hope the linker sorts it out — if it links at all, you have two different string layouts flowing through the same code path. And do not assume -std affects this. It does not. The ABI choice is deliberately independent of the language standard so that C++03 and C++20 objects can be linked together.

The signal an interviewer is looking for is that you name the macro, explain why the inline namespace exists rather than just reciting the fix, and mention that the old ABI has real functionality holes rather than presenting it as a free choice.`,
      },
      {
        question: 'Your organisation is moving from GCC 9 to GCC 14 across roughly 300 repositories. Design the rollout.',
        answer: `Phase 0 — make the current state explicit, still on GCC 9.

Nothing about the new compiler happens yet. Every repository lands three changes under the old toolchain, where they are individually reviewable and individually revertable:
- an explicit -std= in the build, matching whatever GCC 9 was defaulting to
- an explicit _GLIBCXX_USE_CXX11_ABI setting
- a pinned compiler, so CC and CXX are build inputs rather than PATH accidents

This phase looks like busywork and is the highest-leverage part of the project. Without it, every later failure has multiple candidate causes.

Phase 1 — measure, do not estimate.

Stand up a scratch CI lane that builds everything with GCC 14 and is allowed to fail. Publish a dashboard of errors and warnings per repository. Now you have a real work breakdown instead of a guess, and you can see the shape of it: usually a small number of repositories carry most of the pain, and a long tail needs only missing includes.

Expect the long tail to be exactly the libstdc++ header hygiene changes. GCC 14 stopped pulling <algorithm> and <cstdint> in transitively; GCC 15 did the same for <stdint.h>, <cstdint> and <ostream>. These are one-line fixes and can be batch-automated.

Phase 2 — fix in dependency order, layer by layer.

Fix the leaves of the dependency graph first so that downstream repositories do not have to work around broken upstreams. Within a repository, fix in this order: missing includes, then hard syntax and conformance errors, then the promoted-to-error C diagnostics one flag at a time, then dual-ABI link failures, then vendor binaries.

For the promoted diagnostics, enable -Werror per flag as each one reaches zero. Never enable global -Werror at the start; it converts a backlog into an outage.

Phase 3 — sanitize before you benchmark.

Run every test suite built with GCC 14 under -fsanitize=address and -fsanitize=undefined. GCC 14 optimizes harder than GCC 9, so code that relied on the older optimizer being unable to exploit its undefined behavior will now misbehave. That class of bug compiles clean and passes ordinary tests. Fix what the sanitizers find before you look at a single performance number, because a UB fix can move performance in either direction.

Phase 4 — ABI-gate the shared libraries.

For every .so with consumers outside its own repository, build it with both toolchains and run abidiff. The exit status is a bit field; bit 8 (ABIDIFF_ABI_INCOMPATIBLE_CHANGE) means a symbol was removed or a vtable index moved. Make bit 8 a release blocker in CI. This converts "we believe it is compatible" into a mechanical check, and it is the artifact that lets you tell a downstream team they do not need to rebuild.

Phase 5 — canary.

One real service, with real traffic and real benchmarks, runs GCC 14 in production for a defined soak period. It must be non-trivial, because the whole point is to catch codegen regressions and runtime-floor problems that compiling cannot find. Watch latency percentiles, not averages.

Phase 6 — dual-build window.

CI builds every artifact with both toolchains and both must pass. This is deliberately expensive and deliberately finite. It exists so that nobody writes code during the migration that compiles under only one compiler.

Phase 7 — cutover and removal.

New builds default to GCC 14. The old toolchain becomes advisory, then is deleted on a scheduled date. If you skip the removal, the dual-build cost never ends and you will be running three compilers when the next upgrade starts.

Two cross-cutting rules. Build on the oldest host you deploy to, or in a container matching it, so the GLIBCXX and GLIBC version floors do not rise silently. And write down every escape-hatch flag (-fno-strict-aliasing, -fwrapv, -Wno-error=X) in one file with an owner and an expiry, because those are the debts the next migration inherits.`,
      },
      {
        question: 'After the upgrade, one service is 12 percent slower. Walk me through diagnosing it, including how you would bisect a suspected compiler regression.',
        answer: `Start by refusing to assume it is the compiler. Most post-upgrade regressions are not miscompiles.

Step 1 — establish that the regression is real.
Same hardware, same kernel, same CPU governor, same NUMA placement, pinned cores, and enough runs to have a confidence interval. Compare percentiles, not means. A 12 percent shift in a p50 and a 12 percent shift in a p99 have different causes. If the benchmark harness itself was rebuilt, rebuild it once with each toolchain and confirm the harness is not what changed.

Step 2 — separate the compiler from everything that came with it.
The upgrade probably also moved the standard library, and possibly the allocator and the distribution. Build the old compiler against the new libstdc++ if you can, and vice versa. If the regression follows the library rather than the compiler, you are looking at a different problem — often a changed std::string SSO behavior, a changed hash policy, or an allocator change.

Step 3 — narrow by optimization level and flags.
Build the hot component at -O1, -O2 and -O3 with both compilers. If the regression exists at -O2 but not -O1, it is an optimization decision, not a semantics change. Then narrow the flag space: -fno-inline, -fno-tree-vectorize, -fno-tree-loop-distribution and friends, one at a time. In practice the usual culprits are a changed inlining cost model (a function that used to be inlined no longer is, or now is and blows the instruction cache) and a vectorization decision that is a win on the benchmark author machine and a loss on yours.

If a single -fno- flag recovers the performance, you have your answer and a workable short-term fix. Record it as a deliberate decision with an owner.

Step 4 — profile rather than guess.
perf record and perf diff between the two binaries. Look at where the cycles moved. objdump -d the hot function from both builds and read the difference. This is faster than any bisect when the regression is localised, and it is the step that distinguishes an engineer who has actually done this from one who has read about bisecting.

Step 5 — bisecting, when it comes to that.
There are two bisects and they are not the same thing.

Bisecting your own repository: standard git bisect run with a script that builds and runs the benchmark and exits non-zero on regression. Use this when the regression appeared alongside code changes and you are not sure the compiler is involved at all.

Bisecting GCC itself: only worth doing once you have reduced the problem to a small self-contained test case. Use cvise or creduce to shrink the reproducer against a predicate script that compiles it and checks for the wrong behavior. Then bisect the GCC git history with git bisect run over a script that configures, builds a stage-1 compiler (--disable-bootstrap and --enable-languages=c,c++ to keep each step to a workable build), compiles the reduced case, and reports. Each step costs a full compiler build, which is why reducing first is not optional. ccache and a warm object cache help but do not change the order of magnitude.

Step 6 — decide and report.
If it is a genuine GCC regression, file it upstream with the reduced case and the bisected commit; that is what makes it get fixed. Meanwhile ship the targeted workaround — a -fno- flag on one translation unit, an __attribute__((optimize)) or __attribute__((noinline)) on one function, or a source change that stops relying on the pattern. Do not apply a global flag to the whole fleet to fix one function.

The wrong answers here are "we reverted the upgrade" with no diagnosis, and "we assumed the new compiler was slower". A 12 percent number on one service, with no profile and no flag narrowing, is not evidence about a compiler.`,
      },
      {
        question: 'What are the rules for mixing translation units and prebuilt third-party binaries built with different GCC versions?',
        answer: `The governing document is the libstdc++ ABI policy, and it draws a clear line.

Changes that keep the ABI compatible and only bump the libstdc++ minor version:
- adding exported global or static data members
- adding exported functions, static or member
- adding new template instantiations

Changes that require a major version bump because they break existing binaries:
- changing the size, alignment or layout of an exported symbol or type
- changing the name mangling scheme
- deleting exported symbols
- altering the definition of a standard C++ type
- modifying an inheritance hierarchy

In practice this gives you a one-directional rule. Objects built with an older GCC generally link and run against a newer libstdc++, because the newer library still exports everything the older one did. The reverse does not hold: an object built with GCC 14 references GLIBCXX_3.4.33 symbols that a GCC 11 era libstdc++ never had, and you get a version-node resolution failure at load or at first use.

Concretely, the operational rules are:

1. The libstdc++ at runtime must be at least as new as the newest compiler that produced any object in the process. Do not just link against the newest; make sure the deploy target actually has it. This is why you build on the oldest supported host, or in a container that matches it.

2. Every object in one link must agree on _GLIBCXX_USE_CXX11_ABI. This is the dual ABI rule and it is orthogonal to the version rule. A GCC 14 object and a GCC 11 object link fine if both use ABI 1; a GCC 14 object and another GCC 14 object fail to link if they disagree.

3. Anything crossing a binary boundary that involves a standard library type is a coupling you should be deliberate about. std::string, std::list, the stringstream family and several std::locale facets are the types with two definitions. std::ios_base::failure is the one that simply changed, since its base class moved from std::exception to std::system_error — there is no old-ABI fallback for it.

4. Exceptions crossing a shared library boundary require every participant to use the shared libgcc. GCC documents this explicitly: if the application throws and catches across .so boundaries, the application and all the libraries must use -shared-libgcc. Statically linking libgcc into a component that participates in cross-boundary unwinding is how you get a std::terminate that nobody can explain.

5. Your own class layouts are your problem, not libstdc++'s. If a header defines a class with data members and you add a member, reorder members, add a virtual function anywhere but the end, or change a base class, every prebuilt consumer is now wrong. The compiler will not tell you. abidiff will.

The practical stance for a platform team: rebuild everything you own from source with one toolchain and one ABI setting, and treat each prebuilt third-party binary as a named, tracked constraint with an owner. For each one, record which GCC and which ABI setting it was built with, and re-verify on every upgrade. If a vendor binary pins you to the old ABI and you cannot get a rebuild, wrap it behind an extern "C" boundary in its own small shared object so the constraint stops at that boundary instead of spreading through the whole build.

The wrong answer is "GCC is ABI stable so it does not matter". GCC is ABI stable within the rules above and famously was not in 2015, and the exceptions are precisely what the interview question is about.`,
      },
      {
        question: 'How do you verify that a shared library you maintain is still ABI-compatible after a toolchain upgrade or a source change?',
        answer: `You do it mechanically, in CI, with libabigail. Human review of a diff does not catch a vtable index shift.

The tool. abidiff compares the ABI of two ELF shared libraries by reading their debug information (DWARF, or CTF or BTF when present), falling back to comparing ELF symbols when there is none. That fallback matters: if you strip debug info, abidiff still works but sees much less, so build the comparison artifacts with -g.

The workflow in CI:

    abidiff --headers-dir1 old/include --headers-dir2 new/include \\
            old/libfoo.so new/libfoo.so

Restricting to public headers is important. Without it you will get reports about internal types that no consumer can see, and the signal-to-noise ratio collapses. Teams that skip this end up ignoring the tool, which is worse than not having it.

Reading the result. abidiff does not return a simple pass or fail; it returns a bit field:
- bit 1 (value 1) ABIDIFF_ERROR, the tool itself failed
- bit 2 (value 2) ABIDIFF_USAGE_ERROR, you invoked it wrong
- bit 3 (value 4) ABIDIFF_ABI_CHANGE, the ABIs differ
- bit 4 (value 8) ABIDIFF_ABI_INCOMPATIBLE_CHANGE, the difference is incompatible

The gate you want is on bit 8. Bit 4 alone fires on additive changes, which are exactly what a minor release is supposed to contain, so gating on it produces constant false alarms. Bit 8 fires when a symbol was removed or a virtual table index shifted — the changes that actually break an installed consumer.

The --harmless and --no-harmful options control which categories are printed. By default the report emphasises harmful changes. Use --harmless when you are investigating and want to see everything.

Establishing the baseline. Two patterns work. Either check in an abidw dump of the released library and diff new builds against that text file, which keeps the baseline in git and reviewable; or store the previous release .so as a CI artifact and diff binary against binary. The abidw approach is nicer in review because the diff of the dump is human-readable.

Complementary tools. abi-compliance-checker produces an HTML compatibility report and is good for a release note or a conversation with a downstream team. abipkgdiff runs the same analysis across two whole packages, which is how distributions check an entire rebuild.

What none of this catches. ABI tools compare the interface, not the behavior. A function that keeps its signature and changes its semantics is ABI-compatible and API-breaking, and only your tests will find it. Inline functions are the sharp edge here: their bodies are compiled into the consumer, so changing an inline function in a public header changes behavior in already-built binaries that did not recompile, and no ABI tool will flag it. Same for default arguments, and for anything in a template that consumers instantiate.

The practical answer to give: abidiff in CI, gated on the incompatible bit, run against public headers only, with a checked-in abidw baseline, plus an explicit team rule that public headers do not gain data members, do not reorder members, and do not add virtual functions anywhere except the end of the class. The tool enforces what it can and the rule covers the rest.`,
      },
      {
        question: 'How do you run two GCC toolchains side by side, and what makes a build reproducible across them?',
        answer: `The requirement is that a developer, a CI runner and a release build can each produce a byte-comparable artifact without anyone knowing which compiler happens to be on PATH.

Mechanisms, roughly in order of how commonly you meet them.

Red Hat gcc-toolset (and its predecessor devtoolset). A modern GCC packaged for an older RHEL, installed under /opt/rh, activated per shell with scl enable gcc-toolset-13 bash or by sourcing its enable script. Its important property is that it links the newer C++ runtime pieces statically into your binary, so the output still depends only on the base system libstdc++.so.6 and runs on stock hosts of that RHEL generation. That is what makes it usable for shipping rather than just for experimenting.

Container images per toolchain. One image per compiler version, with the compiler, the sysroot and the pinned dependencies baked in. The build never uses the host toolchain. This is the simplest thing that works and it composes with everything else.

Nix or Spack. Both give you multiple toolchains with explicit dependency closures and no PATH ambiguity at all. Heavier to adopt; strongest guarantee once adopted.

update-alternatives, or a bare directory of tarballs plus explicit CC and CXX. Works, and is what most teams actually have. Fine as long as the build never falls back to a bare "gcc".

What makes it reproducible, regardless of mechanism:

1. CC, CXX, AR, RANLIB and the linker are explicit inputs. In CMake that means a toolchain file passed with -DCMAKE_TOOLCHAIN_FILE, not a stray CMAKE_CXX_COMPILER on one developer machine. A build that works because of PATH is a build that will differ between CI and a laptop.

2. -std= and _GLIBCXX_USE_CXX11_ABI are set explicitly, project-wide. Never rely on the compiler default for either. Defaults have changed across GCC 6, 11 and 15 and will change again.

3. The sysroot and the target are explicit. --sysroot pins which headers and which libc you compile and link against, which is what actually determines your GLIBC and GLIBCXX version floor. Building on the oldest host you support is the low-tech version of the same idea.

4. Flags are centralised. One place defines the warning set, the optimization level and the escape-hatch flags, so that comparing two toolchains is comparing two compilers rather than two flag soups.

5. The build records what built it. Stamp the compiler version, the ABI macro and the flag set into the artifact metadata. When something misbehaves in production six months later, this turns an archaeology exercise into a lookup.

For the migration itself, the side-by-side setup is what makes the dual-build window possible: CI builds every artifact under both toolchains, both must pass, and the second lane costs money rather than blocking anybody. When the window ends, you delete the old lane and the old image, on a scheduled date. Toolchains that are never removed accumulate, and the next upgrade then has to reason about four compilers instead of two.`,
      },
    ],
    references: [
      'https://gcc.gnu.org/onlinedocs/libstdc++/manual/using_dual_abi.html',
      'https://gcc.gnu.org/onlinedocs/libstdc++/manual/abi.html',
      'https://gcc.gnu.org/gcc-14/porting_to.html',
      'https://gcc.gnu.org/gcc-15/porting_to.html',
      'https://sourceware.org/libabigail/manual/abidiff.html',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. Standard Libraries and Symbol Versioning
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-stdlib-abi',
    title: 'libstdc++, libc++, glibc and Symbol Versioning',
    icon: 'layers',
    color: '#ea580c',
    questions: 5,
    description: 'The three C++ standard libraries, how glibc symbol versioning sets the minimum host your binary can run on, and the linking choices that decide whether your artifact is portable or pinned.',
    visualizations: [
      {
        title: 'Where the symbols come from and who sets the version floor',
        image: '/diagrams/devops/nb-5-stdlib-abi.png',
        description: `A dynamically linked C++ binary on Linux resolves its symbols from three layers, and each layer has its own compatibility rule.

Layer 1 — your own objects and static libraries.
  Symbol names come from the Itanium C++ ABI mangling scheme, which GCC and
  Clang both implement. _ZN3foo3barEi is foo::bar(int). Because mangling encodes
  parameter types, namespaces and cv-qualification, changing any of them changes
  the symbol, which is why most API changes surface as link errors rather than
  as silent corruption. What the mangling does NOT encode is class layout, so
  adding a data member or a virtual function keeps the symbol identical and
  breaks every consumer you did not rebuild. That is the whole reason ABI tools
  exist.

Layer 2 — the C++ standard library.
  libstdc++ (GNU), soname libstdc++.so.6, symbol version nodes GLIBCXX_3.4.x
  and CXXABI_1.3.x. Default on Linux with g++.
  libc++ (LLVM), selected with -stdlib=libc++, wraps everything in an inline
  namespace derived from _LIBCPP_ABI_VERSION — std::__1 in the stable ABI v1.
  MSVC STL on Windows, shipped as msvcp140.dll and friends.
  These three are mutually incompatible at the binary level. That is a feature:
  the inline namespaces mean an accidental mix is a link error rather than a
  layout mismatch discovered at runtime.

Layer 3 — the C library.
  glibc, soname libc.so.6, symbol version nodes GLIBC_2.x. This is where the
  portability floor is set, and it is set silently.

How glibc symbol versioning actually works:
  Every exported glibc symbol carries a version node. When several
  implementations of one name exist, the linker binds to the default version
  present on the build machine and records a Verneed entry naming that version.
  At load time the dynamic linker requires the running glibc to provide it.
  glibc is backward compatible: old binaries keep working on new glibc, because
  the old version nodes are retained forever.
  glibc is NOT forward compatible: a binary built against a newer glibc names
  version nodes that an older glibc has never heard of, and fails with
      ./app: /lib64/libc.so.6: version \`GLIBC_2.34' not found (required by ./app)
  GLIBC_2.34 is the one everyone hits because glibc 2.34 merged libpthread,
  libdl, librt and libanl into libc.so.6, which gave a very large number of
  ordinary symbols a brand new version node in one release.

The consequence: your version floor is decided by the machine you BUILD on, not
by anything in your source. Build on Ubuntu 24.04, deploy to RHEL 8, and you get
a binary that links cleanly, passes every test in CI, and refuses to start in
production. There is no compiler flag that lowers the floor after the fact.

The four real answers to that problem:
  Build on the oldest host you support, in a container matching it.
  Use a purpose-built old-glibc image: the manylinux images exist precisely for
  this, named by glibc version under PEP 600 (manylinux_2_28 targets glibc 2.28).
  Use a sysroot: --sysroot pointing at an old distribution root, so headers and
  link-time libraries come from the target rather than the host.
  Use gcc-toolset on an old RHEL, which gives you a modern compiler while the
  runtime dependency stays on the base system libraries.

Beneath all of this is the static-versus-dynamic decision, which trades one
class of problem for another. -static-libstdc++ -static-libgcc removes the
libstdc++ version floor while keeping libc dynamic, and is the usual sweet spot
for a shipped executable. Fully static (-static) removes the glibc floor too and
introduces the NSS trap: glibc loads name-service modules with dlopen at
runtime, so getaddrinfo and getpwnam in a fully static glibc binary need the
matching glibc shared objects present anyway. The linker warns about it. musl
does not have that design and is the honest answer when you genuinely want one
self-contained file.`,
      },
      {
        title: 'Quick-fire interview answers — standard libraries and symbol versioning',
        description: `Q: Why does a binary built on a new distribution fail on an old one with a GLIBC version error?
A: glibc symbols carry version nodes. The linker binds to whatever default version exists on the build machine and records a requirement for it. glibc keeps old versions forever, so old binaries run on new glibc, but there is no forward compatibility: an older glibc simply does not have the node. GLIBC_2.34 is the common one because glibc 2.34 folded libpthread, libdl, librt and libanl into libc.so.6 and gave a huge set of symbols a new node at once.

Q: How do you build a binary that runs on old and new Linux hosts?
A: Build against the oldest glibc you intend to support, not the newest. In practice that means building inside a container of the oldest supported distribution, or a manylinux image (named by glibc version under PEP 600), or against a sysroot of the old distribution, or with gcc-toolset on old RHEL so the compiler is modern while the runtime dependency stays old.

Q: When is -static-libstdc++ safe?
A: When the C++ runtime does not have to be shared. A leaf executable, or a plugin whose interface is extern "C" with no C++ types and no exceptions crossing the boundary, is fine. It is not safe when two components in one process each statically link libstdc++ and then exchange C++ objects, throw across the boundary, or rely on shared standard library state — you then have two type_info sets, two locale tables and two allocators in one address space.

Q: Can you link libstdc++ and libc++ code into one program?
A: Not if standard library types cross the boundary. libc++ puts everything in an inline namespace (std::__1 under the stable ABI), so the symbols do not match and you get link errors, which is the good outcome. The dangerous case is passing a std::string through a void* or an opaque handle, where nothing catches it and the layouts differ.

Q: What does a version script buy you for your own shared library?
A: Control of the exported surface. A node with global listing your public prefix and local: *; hides every internal symbol, which shrinks the dynamic symbol table, speeds up load-time relocation, prevents symbol interposition surprises, and stops downstream code from depending on internals you never meant to publish. It also lets you keep an old implementation of a symbol at an old version node while shipping a new default, so existing binaries keep working.

Q: Why does a fully static binary still fail on DNS lookups?
A: glibc implements the Name Service Switch by dlopen-ing modules such as libnss_files and libnss_dns at runtime. Statically linking does not remove that, so getaddrinfo and getpwnam still need matching glibc shared objects on the host. The linker warns about it at link time. If you want a genuinely self-contained binary, build against musl.`,
      },
    ],
    introduction: `Every C++ binary on Linux is a negotiation between three libraries it did not write: the C++ standard library, libgcc, and the C library. Most of the time the negotiation is invisible. The times it is not invisible are the times that cost a weekend, and they cluster around two questions: which standard library implementation is this, and what is the oldest host this artifact can run on.

There are three C++ standard library implementations that matter. libstdc++ is the GNU one, the default with g++ on Linux, shipping as libstdc++.so.6 with GLIBCXX_3.4.x and CXXABI_1.3.x symbol version nodes. libc++ is the LLVM one, the default on Apple platforms and selectable elsewhere with -stdlib=libc++, and it wraps its entire contents in an inline namespace tied to _LIBCPP_ABI_VERSION — std::__1 under the stable version 1. The MSVC standard library is the Windows one and is a separate world entirely. They share a standard and share nothing else at the binary level, and the inline namespace trick means an accidental mix produces link errors instead of silent layout corruption.

Underneath sits glibc, and glibc is where portability is actually decided. Its symbols carry version nodes of the form GLIBC_2.x. The linker binds each reference to the default version present on the machine doing the link, and stamps that requirement into the binary. glibc never removes old version nodes, so an old binary runs on a new glibc forever. The reverse fails hard, with a message naming the version node that is missing. Everyone eventually meets GLIBC_2.34, because glibc 2.34 merged libpthread, libdl, librt and libanl into libc.so.6 and thereby gave an enormous set of everyday symbols a brand-new node in a single release.

The consequence is the part that catches people: your minimum supported host is determined by the machine you build on. No source change and no compiler flag lowers it afterwards. The remedies all amount to the same idea from different directions — build against an old glibc while using a new compiler. The manylinux images encode exactly this for the Python packaging world and are named by glibc version under PEP 600. Red Hat gcc-toolset does it for RHEL. A --sysroot pointing at an old distribution root does it manually.

The remaining lever is what you link statically. -static-libstdc++ and -static-libgcc remove the C++ runtime from the equation while keeping libc dynamic, which is the usual sweet spot for shipping a self-contained executable. It stops being safe the moment two components in one process each carry their own copy of the C++ runtime and then exchange C++ objects or throw exceptions at each other. GCC documents the exception case explicitly: code that throws and catches across shared library boundaries must use the shared libgcc.

Going fully static introduces a different problem. glibc implements the Name Service Switch by dlopen-ing modules at runtime, so a statically linked glibc binary still needs matching glibc shared objects present in order to resolve hostnames or look up users. The linker emits a warning saying so. musl does not work that way, which is why "we want one file with no dependencies" usually ends at musl rather than at glibc plus -static.

An interviewer will probe this by describing a symptom and waiting: a binary that will not start on the production host, a plugin that crashes on free, a library that works until someone links it next to another one. The good answers name the version node, name the ABI boundary, and say which build-time decision caused it.`,
    whenToUse: [
      'Shipping a compiled artifact to hosts you do not control, where the runtime glibc and libstdc++ versions are unknown',
      'Diagnosing a binary that links and tests cleanly but refuses to start on an older production host',
      'Deciding what to link statically for a CLI tool, an agent or a plugin that must drop into a foreign process',
      'Publishing a shared library with an intentional, stable, documented export surface rather than every symbol that happens to be non-static',
      'Evaluating Alpine or musl for container images and needing to explain what actually changes',
      'Integrating a vendor binary that was built against a different standard library implementation than yours',
    ],
    keyConcepts: [
      {
        term: 'Symbol version node',
        definition: 'A label such as GLIBC_2.34 or GLIBCXX_3.4.33 attached to an exported symbol in a shared library. Multiple implementations of one name can coexist under different nodes, with one marked default. The linker records which node it bound to, and the dynamic linker enforces it at load. This is what allows glibc and libstdc++ to keep the same soname across decades.',
      },
      {
        term: 'Backward but not forward compatible',
        definition: 'glibc retains every old version node forever, so a binary built in 2010 still runs today. It cannot work the other way: a binary built against glibc 2.39 names nodes that glibc 2.28 has never defined. Your build machine, not your source, sets the floor.',
      },
      {
        term: 'GLIBC_2.34',
        definition: 'The version node introduced when glibc 2.34 merged libpthread, libdl, librt and libanl into libc.so.6. Because so many ordinary symbols moved at once, it is the node most commonly named in "version not found" failures when a binary built on a 2021-or-later distribution is run on an older one.',
      },
      {
        term: 'manylinux and sysroots',
        definition: 'manylinux is a set of container images defined by PEP 600 and named after the glibc they target, such as manylinux_2_28 for glibc 2.28. A sysroot achieves the same thing manually: --sysroot points the compiler and linker at an old distribution root so headers and link-time libraries come from the target rather than the host.',
      },
      {
        term: '-static-libstdc++ / -static-libgcc',
        definition: 'Link the C++ standard library and the GCC support library into the binary while leaving libc dynamic. Removes the libstdc++ version floor. GCC warns that applications throwing and catching exceptions across shared library boundaries must instead use the shared libgcc, so this is unsafe for components that unwind across a .so edge.',
      },
      {
        term: 'The NSS trap',
        definition: 'glibc loads Name Service Switch modules with dlopen at runtime. A fully static (-static) glibc binary therefore still requires matching glibc shared objects on the host for getaddrinfo, gethostbyname and getpwnam. The linker warns at link time. musl has no equivalent design, which is why truly self-contained binaries are usually built against musl.',
      },
      {
        term: 'Itanium C++ ABI',
        definition: 'The cross-vendor C++ ABI that GCC and Clang implement on Linux and macOS: name mangling (_ZN3foo3barEi), vtable and RTTI layout, and the unwinding interface. It defines what a symbol name means but says nothing about class layout, which is why adding a data member or a virtual function is an ABI break with no symbol change and no diagnostic.',
      },
      {
        term: 'Version script',
        definition: 'A linker input, passed with --version-script, that names version nodes and lists which symbols are global and which are local. The idiom { global: mylib_*; local: *; }; exports only the public prefix and hides everything else, shrinking the dynamic symbol table and preventing accidental dependence on internals.',
      },
    ],
    approach: [
      'Decide the minimum supported host explicitly and write it down as a glibc version, not as a distribution name — then make the build environment match it',
      'Verify the floor mechanically rather than by inspection: objdump -T on the artifact, extract the GLIBC_ and GLIBCXX_ requirements, and fail the build if any exceeds the declared minimum',
      'Choose the standard library deliberately per platform (libstdc++ on Linux, libc++ where the platform expects it) and never let two implementations meet inside one process',
      'Decide the static-versus-dynamic split for each artifact type: leaf executables usually want -static-libstdc++ -static-libgcc; anything that unwinds across a shared library boundary must use the shared libgcc',
      'For every shared library you publish, add a version script with local: *; so the export surface is a decision rather than an accident, and run nm on the result to confirm',
      'Test the artifact on the oldest supported host in CI, not just on the build image, because a version floor problem is invisible everywhere else',
      'When a vendor binary forces a different standard library or ABI, isolate it behind an extern "C" shared object so the constraint stops at that boundary',
    ],
    pitfalls: [
      'Building release artifacts on the newest available image because it is convenient, which raises the glibc floor with no warning and no test failure',
      'Assuming -static produces a portable binary, then shipping something that cannot resolve a hostname because NSS modules are still dlopen-ed at runtime',
      'Statically linking libstdc++ into two shared objects loaded into one process, so there are two copies of the standard library state and freeing an object allocated by the other one corrupts the heap',
      'Using -static-libgcc on a component that throws exceptions across a shared library boundary, producing an unexplained std::terminate instead of a caught exception',
      'Exporting every non-static symbol from a shared library because no version script was supplied, then discovering that downstream code depends on an internal function you wanted to delete',
      'Treating musl as a drop-in for glibc without testing, and finding out late that locale handling, some GNU extensions and threaded allocator performance differ in ways that matter',
    ],
    keyQuestions: [
      {
        question: 'A binary built on Ubuntu 24.04 fails on a RHEL 8 host with: ./svc: /lib64/libc.so.6: version `GLIBC_2.34\' not found (required by ./svc). Diagnose it and give the options.',
        answer: `Diagnosis. glibc exports versioned symbols. Each exported name carries a version node such as GLIBC_2.17 or GLIBC_2.34, and when multiple implementations of a name exist, one node is the default. At link time, ld binds each undefined reference to the default version available on the build machine and writes a Verneed record into the binary saying "I require GLIBC_2.34 from libc.so.6". At load time the dynamic linker checks that the running glibc actually defines that node. RHEL 8 ships glibc 2.28. It does not.

Note what this is not. It is not a missing library — libc.so.6 was found. It is not a missing symbol name. It is a missing version of a symbol that exists. That distinction is the answer to the question.

Why GLIBC_2.34 specifically. glibc 2.34 merged libpthread, libdl, librt and libanl into libc.so.6. A large set of extremely ordinary symbols acquired a fresh GLIBC_2.34 node in that single release, so almost anything built on a 2021-or-newer distribution requires it. This is the single most common version-floor failure in existence.

Confirming it, and finding the full extent:

    objdump -T ./svc | grep -o 'GLIBC_[0-9.]*' | sort -u

That lists every glibc version node the binary requires. The maximum is your actual floor. Do the same for GLIBCXX_ to get the libstdc++ floor, which is a separate and equally silent constraint.

Options, best to worst.

1. Build against the oldest glibc you support. This is the only real fix. Run the release build inside a container of the oldest supported distribution, or a manylinux image — those images exist for exactly this purpose and are named after the glibc they target under PEP 600, so manylinux_2_28 gives you glibc 2.28 and therefore RHEL 8 compatibility. The compiler inside can be modern; what matters is the glibc you link against.

2. Use a sysroot. Keep building on the new host but pass --sysroot pointing at an unpacked old distribution root, so headers and link-time libraries come from the target. More fiddly than a container, and useful for cross-compilation where a container of the target is not practical.

3. Use gcc-toolset on the old distribution. Install RHEL 8, add gcc-toolset-13, and you get a modern compiler with the old glibc. Its design also statically links the newer C++ runtime pieces, so the output keeps depending only on the base system libstdc++.so.6. This is the vendor-supported version of option 1.

4. Ship the runtime with the application. A container image, or an AppImage-style bundle, or shipping your own glibc and invoking the loader explicitly. Works, but you now own patching glibc for CVEs, which is a real ongoing cost.

5. Build against musl instead, fully static. Removes the glibc question entirely at the cost of testing everything again — locale behavior, some GNU extensions, and allocator performance under threads all differ.

What does not work, and gets offered anyway: adding -static-libstdc++ (that fixes the libstdc++ floor, not the glibc floor); adding -static (it changes the failure into the NSS problem rather than solving it, and glibc warns about it at link time); and symbol-version hacks that force old nodes with .symver assembler directives, which appear on the internet, sometimes work, and quietly break when a struct layout differs between the two glibc versions.

The prevention, which is the part worth saying unprompted: declare the minimum glibc as a project constant, and add a CI check that runs objdump -T on the release artifact and fails if any required node exceeds it. A version floor that is only discovered in production is a build system defect, not a deployment surprise.`,
      },
      {
        question: 'When is -static-libstdc++ -static-libgcc the right call, and when does it actively break things?',
        answer: `Right call: you are shipping a self-contained executable to hosts whose libstdc++ you do not control.

That is the common case for a CLI tool, an agent, a build tool, or anything installed outside a package manager. -static-libstdc++ directs the g++ driver to link libstdc++ statically without linking everything else statically, which is exactly the shape you want: the C++ runtime travels with the binary and libc stays dynamic, so you keep the host glibc, its CVE patching, and its NSS behavior. It removes the GLIBCXX version floor completely while leaving the GLIBC floor where it was — which means you still need to build against an old enough glibc, and people forget that half.

Add -static-libgcc alongside it, because libgcc carries the unwinder and the compiler support routines. Linking libstdc++ statically while leaving libgcc dynamic is a half measure that leaves you with a runtime dependency for no benefit.

Where it breaks, in order of how badly.

1. Two copies in one process. If two shared objects loaded into the same address space each statically link libstdc++, the process has two sets of standard library state: two operator new implementations, two locale tables, two std::type_info instances for the same type, two sets of static constructors. Allocate a std::string in one and destroy it in the other and you free into the wrong allocator. A dynamic_cast or a catch by type across the boundary silently fails to match because the type_info addresses differ. Nothing warns you. This is the classic plugin-architecture disaster.

2. Exceptions crossing a shared library boundary. GCC states this outright: when an application throws and catches exceptions across different shared libraries, the application and all the libraries should use the shared libgcc. Static libgcc gives each participant its own unwinder and its own exception registration state, and an exception thrown in one and expected in another can end in std::terminate with a backtrace that explains nothing. If your architecture unwinds across .so edges, you must use -shared-libgcc.

3. Plugins loaded by a host you do not control. If a host process dlopen-s your module and the host itself uses libstdc++ dynamically, your statically linked copy is the second copy from case 1. The safe shape for a plugin is a pure extern "C" interface: no C++ types in the signatures, no exceptions escaping, memory allocated and freed on the same side. Given that interface, static linking becomes safe again, because nothing that would collide ever crosses the boundary.

4. Security patching. A statically linked libstdc++ is frozen at build time. When a fix lands upstream, every artifact must be rebuilt and redeployed. For a fleet of long-lived services this is a real operational cost and often the deciding argument against it.

The decision rule to state in an interview: static C++ runtime for leaf executables and for plugins with a C boundary; shared C++ runtime for anything that passes C++ objects or unwinds across a shared library edge; and never two static copies in one address space. Then add the honest caveat — that -static-libstdc++ solves the libstdc++ floor and does nothing at all about glibc, which is the floor people actually trip over.`,
      },
      {
        question: 'Compare libstdc++, libc++ and the MSVC standard library. What happens if code built against two of them ends up in one program?',
        answer: `The three implementations.

libstdc++ is the GNU implementation, the default for g++ on Linux and the one most Linux distributions build everything against. It ships as libstdc++.so.6 with GLIBCXX_3.4.x version nodes for standard library symbols and CXXABI_1.3.x for the C++ ABI runtime. Its notable historical feature is the dual ABI: since GCC 5.1 it carries two implementations of std::string and std::list, the conforming ones living in the inline namespace std::__cxx11, selected by _GLIBCXX_USE_CXX11_ABI.

libc++ is the LLVM implementation, default on Apple platforms and on some BSDs, selectable elsewhere with -stdlib=libc++. Its central design choice is that everything lives in an inline namespace whose name derives from _LIBCPP_ABI_VERSION. ABI version 1 is the stable default and gives you std::__1; version 2 is the unstable "next" ABI where ABI-breaking improvements accumulate, selected at build time with LIBCXX_ABI_VERSION, or LIBCXX_ABI_UNSTABLE for the full experimental set. Individual ABI-affecting changes are gated behind _LIBCPP_ABI_XXX macros that users are not meant to touch directly. The practical effect of the inline namespace is that libc++ symbols never collide with libstdc++ symbols.

The MSVC standard library is Microsoft's, shipping as msvcp140.dll and its dot libraries. It uses MSVC name mangling and the MSVC object model, so it is not merely a third choice — it is a different ABI universe. Microsoft maintains binary compatibility across VS 2015 through VS 2022 (toolsets v140 to v143), and adds new functionality in dot libraries such as msvcp140_1.dll rather than by breaking the existing ABI.

What happens when two meet.

libstdc++ and libc++ in one Linux program: usually a link error, and that is the good outcome. libc++ types mangle with the __1 inline namespace and libstdc++ types do not, so a function declared to take std::string in one translation unit and defined to take it in the other are simply different symbols. The linker tells you.

The dangerous variant is when the mismatch is laundered through something untyped. Pass a std::string through a void*, or across a C API as an opaque handle, or through a callback typedef that does not mention the type, and nothing checks. Two different layouts now alias the same memory. The failure is a corrupted heap at some later point, and it does not look like an ABI problem when you find it.

The same reasoning applies to exceptions and RTTI. Each implementation has its own std::type_info for a given type, so a catch clause in libstdc++ code does not match an exception thrown by libc++ code even when the type name is identical.

MSVC with either of the others: not applicable on Windows in the normal case, because both GCC-style toolchains that target Windows make a choice. MinGW-w64 targets its own ABI with libstdc++. clang-cl deliberately targets the MSVC ABI and links the MSVC standard library, which is precisely what makes it a drop-in replacement for cl.exe. Mixing MinGW-built C++ objects with MSVC-built C++ objects does not work; a C interface between them does.

The rule to state: pick one C++ standard library per process and enforce it at the build system level, not by convention. When you genuinely must integrate a binary built against the other one, the boundary is extern "C", with plain types, allocation and deallocation on the same side, and no exceptions escaping. That boundary is exactly as narrow as it sounds, and that narrowness is the point.`,
      },
      {
        question: 'What is a fully static binary, what actually breaks, and when should you reach for musl instead?',
        answer: `A fully static binary is one linked with -static: no interpreter, no DT_NEEDED entries, no dynamic linker involvement at startup. It appeals for the obvious reason — copy one file to any host and run it. With glibc, that promise is not quite true.

What breaks with static glibc.

The Name Service Switch. glibc resolves hostnames, users, groups and services through NSS, and NSS loads its backends with dlopen at runtime: libnss_files, libnss_dns, and whatever else /etc/nsswitch.conf names. Static linking does not change that design. A statically linked glibc binary that calls getaddrinfo, gethostbyname or getpwnam still needs glibc shared objects on the host, and needs them to match the glibc it was built against. The linker warns you at link time in so many words: using these functions in statically linked applications requires the shared libraries from the glibc version used for linking. Most people meet this as a program that works perfectly until it has to resolve a hostname.

Character set conversion and locales have the same shape. glibc loads gconv modules and locale data from the filesystem at runtime; a static binary in a scratch container with no locale archive behaves differently from the same binary on a full host.

dlopen itself. A statically linked glibc program cannot reliably dlopen anything, which rules out any plugin architecture.

Licensing. Static linking against glibc is LGPL static linking, which carries relinking obligations for distributed binaries. Worth knowing exists; get an actual answer from someone whose job it is.

When static glibc is fine: a compute-only tool that never touches the network by name, never looks up a user, and never dlopen-s. That is a narrower set of programs than people expect.

Where musl comes in.

musl is a from-scratch libc built for static linking. It has no NSS-style dlopen design — DNS resolution is compiled in and driven by /etc/resolv.conf, and user lookups read the files directly. A static musl binary really is one file, which is why Alpine, Rust static builds, Go-with-cgo static builds and Zig all lean on it.

What you trade. musl implements POSIX plus a limited set of GNU extensions, so code that assumes glibc-only interfaces needs porting. Its locale support is minimal — effectively C and UTF-8 — which matters if you do real internationalisation. Historically its allocator was much slower than glibc under heavy multi-threaded allocation; mallocng improved this substantially but a benchmark on your own workload is still the only honest evidence. Stack sizes for new threads default smaller than glibc, which surfaces as mysterious crashes in code with deep recursion or large stack frames. And debugging tooling, symbolisation and profilers are better tested against glibc.

The recommendation to state: if you want a genuinely dependency-free binary, use musl and static linking together, and budget time to test the differences. If you want portability across glibc hosts, do not use -static at all — build against the oldest glibc you support, add -static-libstdc++ -static-libgcc so the C++ runtime travels with you, and leave libc dynamic. That combination gets almost all of the portability with none of the NSS surprise, and it is the configuration most shipped Linux CLI tools actually use.`,
      },
      {
        question: 'How would you add symbol versioning to a shared library you own, and what does it get you?',
        answer: `Start with the simpler thing, which most libraries need and most libraries skip: control the export surface.

By default, every non-static symbol in a shared object lands in the dynamic symbol table. That means every internal helper, every inlined-but-emitted template instantiation, and every static initialiser is public, interposable, and available for a downstream team to accidentally depend on. Two mechanisms fix it, and using both is normal:

    -fvisibility=hidden               # nothing is exported unless marked
    __attribute__((visibility("default")))   # on the ones that are

and a linker version script, passed with --version-script:

    LIBFOO_1.0 {
      global:
        foo_init;
        foo_process;
        foo_shutdown;
      local:
        *;
    };

The local: *; line is the load-bearing part. It hides everything not explicitly listed. Wildcards are shell-style, so global: foo_*; works, though the linker documentation warns against wildcards in the global section of anything but the last version node, because a later-added symbol can silently join an old version set.

What that alone buys you: a much smaller dynamic symbol table (faster load-time relocation), no symbol interposition surprises where an unrelated library in the process happens to define a name you also define, and an export list that is reviewable in a code review. Verify it with nm -D --defined-only libfoo.so and confirm it matches the script.

Now the versioning proper. Adding named version nodes lets one library provide two implementations of the same symbol name, one for old binaries and one for new:

    LIBFOO_1.0 {
      global: foo_process;
      local: *;
    };

    LIBFOO_2.0 {
      global: foo_process;
    } LIBFOO_1.0;

with the two implementations bound in the source using the .symver assembler directive, so foo_process_v1 becomes foo_process@LIBFOO_1.0 and foo_process_v2 becomes foo_process@@LIBFOO_2.0 (the double at-sign marking the default that new links bind to). Binaries linked before the change recorded a requirement for LIBFOO_1.0 and keep getting the old behavior; anything linked afterwards gets the new one. This is exactly the mechanism glibc uses to have kept the same soname since 1997.

What it costs. You maintain both implementations forever, or until you are willing to break old binaries. Every release you must decide, per changed symbol, whether the change is compatible. This is real ongoing work and it is why most application libraries should not do it.

When it is worth it: you are a platform library with consumers you cannot rebuild, you are shipping into a distribution, or you have binary plugins in the wild. When it is not worth it: you control every consumer and can rebuild them together — in that case just bump the soname on a breaking change and let the linker refuse the mismatch loudly.

Whichever route you take, pair it with an ABI check in CI. Run abidiff between the previous release and the candidate, gate on the incompatible bit, and restrict the comparison to public headers so internal churn does not drown the report. The version script declares your intent; abidiff verifies you kept it.`,
      },
    ],
    references: [
      'https://gcc.gnu.org/onlinedocs/libstdc++/manual/abi.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html',
      'https://libcxx.llvm.org/DesignDocs/ABIVersioning.html',
      'https://sourceware.org/binutils/docs/ld/VERSION.html',
      'https://sourceware.org/libabigail/manual/abidiff.html',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 6. MSVC Toolchain and Windows Native Build
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-msvc',
    title: 'MSVC Toolchain and Windows Native Build',
    icon: 'terminal',
    color: '#ea580c',
    questions: 6,
    description: 'The Windows native build stack end to end: cl.exe and link.exe, the developer environment, MSBuild versus CMake, the CRT variants and the mismatched-runtime crash, DLL exports, PDBs, and pinning a toolset in CI.',
    visualizations: [
      {
        title: 'From cl.exe to a shipped Windows binary',
        image: '/diagrams/devops/nb-6-msvc.png',
        description: `The Windows toolchain looks superficially like the Unix one and differs in every detail that matters operationally.

The environment comes first.
  MSVC does not find its own headers and libraries. It reads PATH, INCLUDE, LIB,
  LIBPATH and around twenty more environment variables that are set by a batch
  file. That batch file is VsDevCmd.bat in Common7\\Tools, or one of the
  architecture-specific wrappers in VC\\Auxiliary\\Build:
    vcvars32.bat        x86 host, x86 target
    vcvars64.bat        x64 host, x64 target
    vcvarsx86_amd64.bat x86 host, x64 target (cross)
    vcvarsall.bat       parameterised: architecture, platform_type,
                        winsdk_version, -vcvars_ver, spectre_mode
  vcvarsall with no arguments configures x86 native, which surprises people who
  expect x64. Microsoft explicitly warns not to run vcvars files from two
  different Visual Studio versions in the same command window.

The two binaries that do the work.
  cl.exe compiles, and by default also invokes the linker. cl /c compiles only.
  link.exe links objects and libraries into an .exe or .dll.
  Everything else — MSBuild, CMake, Ninja, the IDE — ultimately drives these two.

Project systems, and which one you actually have.
  MSBuild with .vcxproj is the native Visual Studio format. It runs headless
  (msbuild app.sln /p:Configuration=Release /p:Platform=x64 /m), works in
  containers, and supports a binary logger. Note that since Visual Studio 2019
  version 16.5, MSBuild and devenv do NOT take the toolset from the command-line
  environment — the project file decides, which is a common source of "I ran
  vcvarsall and it built the wrong thing".
  CMake either generates .vcxproj files (-G "Visual Studio 17 2022" -A x64) or
  drives cl.exe directly through Ninja inside a developer prompt. Ninja is much
  faster; the generator route is better when Visual Studio itself must open the
  project.

The CRT, which is where the crashes come from.
  Since Visual Studio 2015 the C runtime is split in three: the Universal CRT
  (a Windows component, shipped in the Windows SDK, ucrtbase.dll), the vcruntime
  (compiler-specific: exception handling, RTTI, runtime checks, must match your
  compiler version), and the CRT startup code, which is always statically linked.
    /MD   msvcrt.lib   + ucrt.lib   + vcruntime.lib   dynamic release
    /MDd  msvcrtd.lib  + ucrtd.lib  + vcruntimed.lib  dynamic debug
    /MT   libcmt.lib   + libucrt.lib + libvcruntime.lib  static release
    /MTd  libcmtd.lib  + libucrtd.lib + libvcruntimed.lib static debug
  Link with no /M option at all and you get the static set by default.
  The C++ standard library follows the same split: msvcprt.lib (import library
  for msvcp140.dll) under /MD, libcpmt.lib under /MT.

Why mixing them is fatal.
  Each image — every EXE and every DLL — carries or loads its own CRT. Different
  CRTs have different allocators, different internal structure layouts and
  different storage. Allocate in one and free in another and you have handed a
  pointer to a heap that never owned it. Microsoft is blunt about it: allocated
  memory, CRT resources and classes passed across a DLL boundary cause problems,
  and direct transfer of such resources is discouraged. Even with the same CRT
  version, file handles, locales and environment variables do not travel safely.
  MSVC helps by emitting detect-mismatch records, so linking a /MT object with a
  /MD object, or a debug object with a release one, gives LNK2038 naming
  RuntimeLibrary or _ITERATOR_DEBUG_LEVEL rather than a runtime crash.

Exports, which have no Unix equivalent.
  Nothing leaves a DLL unless you say so. __declspec(dllexport) on the
  definition side and __declspec(dllimport) on the consumer side, normally via
  one macro switched by a per-project define. A .def file is the alternative and
  the only way to get ordinals, NONAME or PRIVATE. Linking a DLL produces both
  the .dll and an import library .lib — a stub that resolves to the DLL at load
  time, not to be confused with a static library .lib containing real code.

Debug symbols live outside the binary.
  /Z7 puts full debug info in the .obj. /Zi puts it in a PDB. /ZI is /Zi plus
  Edit and Continue, and forces /Gy and /FC. The linker then produces the final
  PDB when given /DEBUG. The PDB is matched to the binary by GUID and age, so a
  rebuilt binary invalidates the old PDB — archive them together or run a symbol
  server, or your production minidumps are unreadable.

Inspection.
  dumpbin /dependents /exports /imports /headers (it is link.exe /dump).
  Dependency Walker is long dead; the modern replacement is Dependencies, which
  understands API sets (the api-ms-win-* virtual DLLs) that depends.exe reports
  as missing.`,
      },
      {
        title: 'Quick-fire interview answers — MSVC',
        description: `Q: What is the difference between /MT and /MD?
A: /MT statically links the CRT into the image; /MD links to the shared CRT DLLs (ucrtbase.dll, vcruntime140.dll, msvcp140.dll). /MTd and /MDd are the debug variants. Every EXE and DLL in a process makes this choice independently, and mixing them means multiple CRTs with separate heaps in one process.

Q: What actually happens when a DLL built with /MT frees memory allocated by an EXE built with /MD?
A: The free goes to the wrong allocator. The static CRT in the DLL has its own heap and its own bookkeeping; the pointer belongs to the shared CRT heap. It is heap corruption, and it usually crashes somewhere unrelated much later. The correct designs are to pass memory the caller allocated, to expose a matching free function from whichever side allocated, or to use only value types and handles across the boundary.

Q: Does anything catch a runtime mismatch at build time?
A: Yes, often. MSVC emits detect-mismatch directives for the runtime library and iterator debug level, so a /MT object linked with a /MD object, or a debug object with a release one, produces LNK2038 naming RuntimeLibrary or _ITERATOR_DEBUG_LEVEL. It does not catch the case where the mismatch is between two separately linked binaries that only meet at runtime.

Q: How do you export a function from a DLL?
A: __declspec(dllexport) on the definition and __declspec(dllimport) at the consumer, normally through one macro flipped by a define set only when building the DLL. It works for C++ mangled names, which is the main reason to prefer it over a .def file. Use a .def file when you need ordinals, NONAME or PRIVATE, which cannot be expressed any other way.

Q: What is the difference between the .lib produced next to a DLL and a static library .lib?
A: The one next to a DLL is an import library: stubs plus a name table that tell the loader which DLL and which export to bind. The static library contains real object code that gets copied into your binary. Same extension, completely different artifact.

Q: How do you pin a specific MSVC toolset in CI?
A: Locate the installation with vswhere (vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath), then call vcvarsall.bat with an explicit architecture and -vcvars_ver, for example -vcvars_ver=14.44 for a specific VS 2022 toolset. Pin the Windows SDK version in the same call. Do not rely on "latest installed", which changes under you when the agent image updates.`,
      },
    ],
    introduction: `Windows native C++ is a full second toolchain, not a porting detail. If a job description says strong knowledge of MSVC libraries, it means the interviewer expects you to be able to debug a build on a machine with no Unix tooling, where the compiler is cl.exe, the linker is link.exe, the standard library is Microsoft's, symbols live in a separate file, and nothing is exported from a shared library unless you explicitly said so.

The first thing that differs is that the toolchain does not know where it is. MSVC depends on PATH, INCLUDE, LIB, LIBPATH and a long list of other environment variables set by a batch file the installer generated for your specific installation. VsDevCmd.bat is the general one; vcvars32, vcvars64 and the cross-tools variants are thin wrappers; vcvarsall.bat is the parameterised form that takes a host and target architecture, optionally a Windows SDK version, optionally a toolset version through -vcvars_ver, and optionally Spectre-mitigated libraries. Microsoft warns explicitly against mixing vcvars files from different Visual Studio versions in one shell, and against copying a vcvarsall.bat between machines.

The second difference is the C runtime, and it is where most Windows-specific production incidents come from. Since Visual Studio 2015 the CRT is three pieces: the Universal CRT, which is now a Windows component shipped through the Windows SDK; the vcruntime, which is compiler-version-specific and holds exception handling, RTTI and runtime checks; and the startup code, which is always statically linked. The /MT, /MTd, /MD and /MDd switches select which set of import libraries you get. Because every EXE and every DLL in a process makes that choice independently, a single process can end up with several CRTs, each with its own heap and its own static state. Passing an allocation, a FILE handle, a locale or a C++ object across that boundary is how you get corruption that surfaces nowhere near its cause.

The third difference is export control. On Linux every non-static symbol in a shared object is exported by default and you use visibility attributes or a version script to hide them. On Windows the default is the opposite: nothing is exported until you mark it with __declspec(dllexport) or list it in a .def file. Linking a DLL produces two artifacts, the DLL itself and an import library with a .lib extension that is not a static library and contains no code. Getting these two .lib meanings confused is a reliable source of confusion in mixed teams.

The fourth is debug information. MSVC keeps symbols in a separate PDB, matched to the binary by GUID and age. /Z7 embeds full debug info in the object files instead, /Zi produces a PDB, and /ZI produces an Edit-and-Continue-capable PDB while forcing /Gy and /FC and disabling most optimization pragmas. A release build with no archived PDB produces minidumps nobody can symbolise, which is a process failure rather than a technical one and is very common.

Around all of this sits the versioning story, which changed recently. For Visual Studio 2022 and earlier, the toolset had a v-number tied to the IDE release: v140 for 2015, v141 for 2017, v142 for 2019, v143 for 2022, with the underlying compiler versioned 14.xx and binary compatibility maintained across the whole v140-to-v143 range. Starting with Visual Studio 2026, Microsoft decoupled the MSVC version from the Visual Studio version, so the package is identified by the toolset version itself in a v##.## form. In CI this means locating toolchains with vswhere and pinning explicitly, rather than trusting whatever the hosted agent image installed last week.

An interviewer probes this area with symptoms: a crash on free that only happens in release, a DLL that will not load, a stack trace with no function names, a build that works in Visual Studio and fails in the pipeline. Each of those maps to one of the five differences above, and naming the mechanism is what separates someone who has shipped on Windows from someone who has only cross-compiled for it.`,
    whenToUse: [
      'Adding a Windows target to a codebase that has only ever been built with GCC or Clang on Linux',
      'Debugging a crash that only reproduces in a release build on Windows and points at a free or a destructor',
      'Setting up a Windows build agent and needing the toolset and SDK to be pinned rather than whatever the image happens to ship',
      'Shipping a native DLL that third parties link against, where the export surface and the CRT choice become a public contract',
      'Symbolising production minidumps and discovering the PDBs were never archived',
      'Evaluating clang-cl to get Clang diagnostics and sanitizers while staying on the MSVC ABI and standard library',
    ],
    keyConcepts: [
      {
        term: 'Developer command prompt and vcvarsall',
        definition: 'MSVC requires PATH, INCLUDE, LIB, LIBPATH and around twenty other variables that the installer-generated batch files set. VsDevCmd.bat is the general entry point; vcvarsall.bat takes an architecture argument (x64, x86_amd64, amd64_arm64 and so on), an optional Windows SDK version, an optional -vcvars_ver toolset selector and an optional spectre flag. With no arguments it configures x86 native, not x64.',
      },
      {
        term: 'The three-part CRT',
        definition: 'Universal CRT (ucrtbase.dll, a Windows component delivered through the Windows SDK), vcruntime (compiler-version-specific: exception handling, RTTI, runtime checks), and the startup code, which is always statically linked. /MD selects the import libraries msvcrt.lib, ucrt.lib and vcruntime.lib; /MT selects libcmt.lib, libucrt.lib and libvcruntime.lib. With no option at all, the linker uses the static set.',
      },
      {
        term: 'Mismatched runtime',
        definition: 'Two images in one process using different CRTs, or the same CRT in debug and release form. Each has its own allocator, its own internal layouts and its own static state, so memory, FILE handles, locales and C++ objects cannot safely cross between them. MSVC emits detect-mismatch records so many cases fail at link with LNK2038 naming RuntimeLibrary or _ITERATOR_DEBUG_LEVEL.',
      },
      {
        term: 'dllexport, dllimport and .def',
        definition: 'Nothing leaves a Windows DLL unless exported. __declspec(dllexport) adds the export directive at compile time and handles C++ decorated names, which is why it is preferred; __declspec(dllimport) on the consumer side lets the compiler generate a direct indirect call. A .def file is the alternative and the only route to ordinals, NONAME and PRIVATE. Using both together is allowed.',
      },
      {
        term: 'Import library versus static library',
        definition: 'Linking a DLL emits a .lib containing stubs and a name table that bind to the DLL at load time. A static library is a .lib containing real object code copied into the consumer. Identical extension, entirely different artifact, and a routine source of confusion.',
      },
      {
        term: 'PDB and debug information format',
        definition: '/Z7 keeps full symbolic debug info inside each .obj and produces no compiler PDB. /Zi produces a separate PDB and implies /DEBUG. /ZI is /Zi plus Edit and Continue, forces /Gy and /FC, and disables optimize pragmas. The linker produces the final PDB. Binary and PDB are matched by name, GUID and age, so a rebuild invalidates old PDBs.',
      },
      {
        term: '/permissive- and conformance',
        definition: 'Turns off Microsoft language extensions and sets /Zc:referenceBinding, /Zc:strictStrings, /Zc:rvalueCast and /Zc:ternary to conforming behaviour; from VS 2022 17.6 it also sets /Zc:lambda and /Zc:externConstexpr. It is implied by /std:c++20 and /std:c++latest, and is required for C++20 modules. It enables two-phase name lookup, which is what breaks most legacy template code on first contact.',
      },
      {
        term: 'Toolset version, Visual Studio version, Windows SDK',
        definition: 'Three independent axes. Through VS 2022 the platform toolset carried a v-number tied to the IDE (v140 for 2015 through v143 for 2022) with binary compatibility maintained across that range; from VS 2026 the MSVC version is decoupled and identified by the toolset version itself. The Windows SDK versions separately and supplies the UCRT headers and libraries. Pin all three in CI.',
      },
    ],
    approach: [
      'Establish the environment explicitly: locate the installation with vswhere, then call vcvarsall.bat with an explicit architecture, an explicit -vcvars_ver and an explicit Windows SDK version. Never depend on "the latest installed"',
      'Pick one project system and stick to it. MSBuild with .vcxproj if Visual Studio must open the project; CMake with Ninja inside a developer prompt if build speed matters. Remember that since VS 2019 16.5, MSBuild ignores the command-line environment when choosing the toolset',
      'Decide the CRT model once, per whole product, and enforce it: /MD everywhere unless there is a written reason for /MT, because every DLL boundary inherits that decision',
      'Design DLL interfaces so nothing dangerous crosses them: pass by value, let the caller own memory, or export a matching free function. Reserve C++ types crossing a DLL edge for cases where you control both sides and both use the same dynamic CRT',
      'Put exports behind one macro per library, defined to dllexport only when building that library and to dllimport otherwise, and turn the macro on deliberately rather than exporting whole classes by reflex',
      'Build release with /Z7 or /Zi plus linker /DEBUG, and archive the PDBs with the binaries or publish them to a symbol server. A release artifact without a retrievable PDB is an unsupportable artifact',
      'Adopt /permissive- and an explicit /std: on new code, and stage it per-project on legacy code, since two-phase lookup will surface real errors in old templates',
    ],
    pitfalls: [
      'Letting different projects in one solution choose different runtime libraries, so the product works in debug and corrupts the heap in release, or the reverse',
      'Allocating in one module and freeing in another across a DLL boundary, which is heap corruption whenever the two modules do not share exactly the same CRT instance',
      'Shipping without archiving PDBs, so every production minidump symbolises to hexadecimal and the crash cannot be triaged at all',
      'Assuming the .lib next to a DLL contains code, then wondering why the DLL still has to be deployed, or linking an import library expecting a static build',
      'Relying on whatever toolset the hosted CI agent has installed, so an agent image update silently changes the compiler and the Windows SDK under a release build',
      'Marking an entire class __declspec(dllexport) to make a link error go away, which exports every member including compiler-generated ones and freezes the class layout as part of the public ABI',
    ],
    keyQuestions: [
      {
        question: 'A DLL crashes inside free() when the host EXE passes it an object to delete. Walk through the cause and the fixes.',
        answer: `Cause: the two modules are not using the same C runtime instance, so the allocation and the deallocation went to different heaps.

The mechanism. Every image on Windows, EXE or DLL, carries or binds its own CRT. Which one it gets is decided at build time by the /M switch: /MD and /MDd bind to the shared CRT DLLs (ucrtbase.dll, vcruntime140.dll, and msvcp140.dll for the C++ library), while /MT and /MTd statically link the CRT into the image. Link with no /M option and the linker uses the static set by default, which is how this happens accidentally.

Each CRT has its own allocator, its own heap, and its own internal bookkeeping structures. When the EXE calls new, it takes memory from its CRT heap. When the DLL calls delete on that pointer, its own CRT looks for bookkeeping it never wrote, in a heap that never owned the block. Microsoft states the general form of this plainly: allocated memory, CRT resources and classes passed across a DLL boundary can cause problems in memory management, internal static usage, or layout interpretation, and direct transfer of such resources is discouraged.

The debug-versus-release form of the same bug is worse, because the debug CRT allocates with guard bytes and extra header fields, so the layouts genuinely differ and even the same /M family will not survive the mix.

Diagnosing it. dumpbin /dependents on both modules: if one imports vcruntime140.dll and msvcp140.dll and the other imports neither, the second is statically linked and you have your answer. Check /MD versus /MT in both project configurations, including every static library that either one links. Application Verifier with heap checks enabled will fault at the moment of the bad free rather than later, which turns an unreproducible crash into a deterministic one.

Note what MSVC does catch for you. The compiler emits detect-mismatch records for the runtime library and the iterator debug level, so linking a /MT object against a /MD object, or a debug object against a release one, produces LNK2038 naming RuntimeLibrary or _ITERATOR_DEBUG_LEVEL. That covers everything inside a single link. It cannot cover two separately linked binaries that only meet at runtime, which is exactly the EXE-and-DLL case.

Fixes, in order of robustness.

1. Fix the interface so nothing crosses. This is the real answer. Whoever allocates, frees. Export a matching destroy function from the DLL, so the EXE calls dll_create_thing and dll_destroy_thing and never touches delete on a foreign pointer. Or let the caller supply the buffer and have the DLL only fill it. Microsoft recommends exactly this shape: design DLL export interfaces to pass information by value, or to operate on memory passed in by the caller, and encapsulate resources behind handles or exported functions.

2. Make everything share one dynamic CRT. Build every EXE, DLL and static library in the product with /MD (or /MDd), with the same toolset and the same settings, so there is one CRT instance in the process. This works and is a normal choice, but it is a whole-product constraint that every future dependency inherits, and it does not survive a third-party DLL that made a different choice.

3. Avoid C++ types on the boundary entirely. No std::string, no std::vector, no exceptions escaping, no classes with virtual functions where the layout is part of the contract. A plain C interface with POD structs and explicit lengths is immune to all of this, and is the standard shape for a DLL with external consumers.

The caveat worth adding unprompted: even with an identical CRT version on both sides, some CRT resources still do not travel safely across DLL boundaries — file handles, locales and environment variables among them, because they refer to per-CRT-instance state. Matching the runtime removes the heap problem, not the whole class of problem.`,
      },
      {
        question: 'How do you produce, ship and use PDBs so that a production crash is actually debuggable?',
        answer: `The build side.

Choose a debug information format. /Zi is the default choice: the compiler writes a PDB and keeps the objects and the binary small. /Z7 puts full symbolic debug info inside each .obj instead, with no compiler PDB at all; the linker can still produce a PDB from those objects when given /DEBUG. /Z7 is the better choice for distributed and cached builds, because a .obj is self-contained and caches cleanly, whereas /Zi objects reference an external compiler PDB that the build must also carry. /ZI is /Zi plus Edit and Continue; it forces /Gy and /FC, disables optimize pragmas, is incompatible with /clr, and has no place in a release build.

Critically, this is orthogonal to optimization. /Zi does not affect optimizations. Release builds should be fully optimized and fully symbolised. Producing an unsymbolised release build is not a performance decision, it is a missing artifact.

The linker needs /DEBUG to emit the final PDB. Pair it with /OPT:REF and /OPT:ICF explicitly, because /DEBUG turns those off by default and you do not want a release binary carrying dead code just because you asked for symbols.

Matching. The compiler embeds the PDB path and a timestamped signature into each object; the linker records a GUID and an age in the binary. A debugger loads a PDB only when name, GUID and age all agree. Rebuild the binary and the old PDB is dead, even if the source did not change. There is no way to force Visual Studio to load mismatched symbols; WinDbg can be told to with .symopt+0x40 and the results are not trustworthy.

The ship side. Three things must be archived together for every release: the binary, its PDB, and the exact source revision. Missing any one of them and a minidump is hexadecimal.

Two mechanisms, and you generally want both. A symbol server (a share or an HTTP endpoint indexed by GUID) lets any debugger fetch the right PDB automatically for any build, including ones from two years ago. Source indexing or source link embeds the source location into the PDB so the debugger can retrieve the matching revision. Where the PDB will live is stamped into the binary, so if you move symbols after the fact, set /PDBALTPATH at link time to record the path you actually intend.

The consume side. On a crash you get a minidump. The debugger reads the GUID and age from the dump, fetches the PDB from the symbol server, then fetches the source. This works or it does not, and the failure is always the same: somebody rebuilt and republished the binary without republishing the PDB, or the CI job that uploads symbols is a best-effort step that has been quietly failing.

Do not ship PDBs to customers by default. They contain function names, local variable names, file paths and type layouts, which is a meaningful information disclosure for a commercial product. Keep them internal on a symbol server. One exception: /Z7 exists partly so that a third-party library vendor can ship debuggable static libraries without a separate PDB file, since the info is inside the .obj and travels with the .lib.

Two operational rules to state. Make symbol upload a required, failing step of the release pipeline, not an optional one. And test the path end to end at least once per release cycle by symbolising a deliberately crashed build — a symbol server nobody has ever fetched from is not known to work.`,
      },
      {
        question: 'You are setting up Windows CI for a C++ project. How do you pin and locate the toolchain, and what are the failure modes?',
        answer: `The goal is that the build depends on a named toolset and a named SDK, not on what the agent image happens to contain this week.

Step 1 — find the installation. Do not hardcode a path. Program Files versus Program Files (x86) changed at VS 2022, and the edition folder (Community, Professional, Enterprise, BuildTools) varies by agent. Use vswhere, which ships with every modern install at a fixed location:

    vswhere -latest -products * ^
            -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 ^
            -property installationPath

The -requires filter matters: it will not return an installation that has the IDE but not the C++ tools, which is a common cause of a build that fails only on one agent.

Step 2 — set the environment explicitly. From the returned path, call VC\\Auxiliary\\Build\\vcvarsall.bat with every axis named:

    vcvarsall.bat x64 10.0.22621.0 -vcvars_ver=14.44

That is architecture, Windows SDK version, and toolset version. With no arguments vcvarsall configures x86 native, which is not what anyone wants and is a genuinely common mistake. The -vcvars_ver values follow the compiler versioning: 14.4x for VS 2022 toolsets, 14.29 for VS 2019, and so on; you can also give a full version like 14.44.35207. Add spectre as the last argument only if you actually need the mitigated libraries, since it requires those libraries to be installed.

Two Microsoft warnings worth repeating: do not run vcvars files from two different Visual Studio versions in the same command window, and never copy a vcvarsall.bat from another machine, because it is generated per installation.

Step 3 — know which project system honours the environment. This is the subtlety that catches people. Since Visual Studio 2019 version 16.5, MSBuild and devenv do not take the toolset and libraries from the command-line environment; the .vcxproj decides, through its PlatformToolset and WindowsTargetPlatformVersion properties. So if you build with MSBuild, pin in the project file (or pass /p:PlatformToolset=v143 /p:WindowsTargetPlatformVersion=10.0.22621.0) and treat vcvarsall as merely putting msbuild.exe on PATH. If you build with CMake plus Ninja, the environment is what matters and vcvarsall is load-bearing. Mixing the two mental models produces a build that ignores your pin and gives no indication that it did.

Step 4 — install what you pinned. Agent images ship the latest toolset and often only the latest. Pinning to v14.29 on an image that only has v14.44 fails at vcvarsall, which is the good outcome; pinning by a mechanism the build ignores succeeds with the wrong compiler, which is the bad one. Either install the toolset explicitly in the pipeline, or use your own container image with the Build Tools installed at a fixed version.

Step 5 — make the pin verifiable. Print cl.exe /Bv or just cl with no arguments at the start of every build and record it in the log, and stamp the compiler version and SDK version into the artifact metadata. When a regression appears three weeks later, the first question is always whether the toolchain moved, and this makes that a lookup instead of an investigation.

The failure modes, collected: silently building x86 because vcvarsall got no arguments; MSBuild ignoring the environment you carefully set; an agent image update moving the toolset under a release build; a machine with the IDE but not the C++ workload; and two vcvars invocations in one shell from different Visual Studio versions. All five are pinning failures, and all five look like compiler bugs the first time you meet them.

One note on versioning that is newly relevant: through VS 2022, the platform toolset number tracked the IDE release (v140 for 2015 through v143 for 2022, with binary compatibility maintained across the whole range). Starting with Visual Studio 2026, Microsoft decoupled the MSVC version from the Visual Studio version, so the toolset is identified by its own v##.## version. Pipelines that pattern-match on v14x strings need updating.`,
      },
      {
        question: 'Explain __declspec(dllexport)/dllimport versus a .def file, and how you would structure exports for a library with external consumers.',
        answer: `The default matters first: on Windows, nothing is exported from a DLL unless you say so. This is the opposite of ELF, where every non-static symbol is exported until you hide it. So the Windows question is never how to hide symbols, it is how to publish them.

__declspec(dllexport). Applied to a function, variable, class or member, it adds the export directive to the object file so the linker puts the name in the DLL export table. Microsoft is explicit about why this beats a .def file: it handles decorated C++ names. There is no standard specification for name decoration, so a mangled name can change between compiler versions, and hand-listing mangled names in a .def file is a maintenance trap. With dllexport, a compiler upgrade just recompiles.

__declspec(dllimport) on the consumer side is not merely decorative. Without it the compiler generates a call to a thunk which then jumps through the import address table; with it, the compiler knows the symbol is imported and generates the indirect call directly. For data it is stronger than an optimization — importing a variable without dllimport gives you the address of the thunk rather than the variable.

The standard structure, one macro per library:

    // foo_export.h
    #ifdef _WIN32
    #  ifdef FOO_BUILDING
    #    define FOO_API __declspec(dllexport)
    #  else
    #    define FOO_API __declspec(dllimport)
    #  endif
    #else
    #  define FOO_API __attribute__((visibility("default")))
    #endif

FOO_BUILDING is defined only in the DLL project. The same header therefore exports when building the library and imports when consuming it, and the non-Windows branch gives you the ELF equivalent for free. CMake generates this header for you with generate_export_header, which is worth using rather than hand-writing it in every project.

When to use a .def file. Some export attributes exist only there: ordinals, NONAME (export by ordinal with no name in the table, which shrinks the table and obscures the API), and PRIVATE. If you must maintain ordinal stability for existing consumers, or you are matching a legacy API that was published by ordinal, a .def is the only route. Using __declspec(dllexport) and a .def file together does not cause build errors, so a hybrid is legal.

Structuring the export surface for external consumers.

Export functions, not classes. __declspec(dllexport) on a whole class exports every public data member and member function, including compiler-generated ones, and freezes the class layout as part of the ABI. Add a data member later and every consumer that did not recompile is now reading the wrong offsets, with no diagnostic. This is the single most common way a Windows library ends up unable to evolve.

Prefer a C-shaped boundary for anything you do not control both sides of: opaque handles, functions taking and returning POD, explicit create and destroy pairs so allocation and deallocation stay on one side of the CRT boundary, error codes rather than exceptions escaping the DLL. If you need a C++ face, build it as a header-only wrapper on top of the C interface, compiled into the consumer.

Do not export inline functions or templates across the boundary casually. Their bodies are compiled into the consumer, so changing one changes the behavior of already-built binaries that never recompiled, which is API and ABI drift that no tooling flags.

Verify what you actually published, every release: dumpbin /exports on the DLL, diffed against the previous release. Exports drift, especially when someone marks a class to make one link error go away, and the export table is the contract.`,
      },
      {
        question: 'What does /permissive- change, why would you adopt it, and what breaks first?',
        answer: `What it is. /permissive- turns off the Microsoft language extensions that make MSVC accept non-conforming C++, and sets a group of /Zc conformance switches to their standard behaviour. It is not a standard selector — /std:c++17, /std:c++20 and /std:c++latest do that. It is a "stop accepting things the standard forbids" switch.

Concretely it sets /Zc:referenceBinding, /Zc:strictStrings and /Zc:rvalueCast, all of which default to non-conforming, and since VS 2017 15.3 also /Zc:ternary. From Visual Studio 2022 update 17.6 it additionally sets /Zc:lambda and /Zc:externConstexpr. You can override any individual one by putting the /Zc option after /permissive- on the command line.

It is not optional in modern configurations. /permissive- is implied by /std:c++latest from VS 2019 16.8 and by /std:c++20 from 16.11, and it is required for C++20 modules support. It is also on by default in new projects created by Visual Studio 2017 15.5 and later. So most teams meet it by upgrading the language standard rather than by choosing it.

Why adopt it. Portability, mainly. Code that compiles under /permissive- has a far better chance of compiling under GCC and Clang, because the extensions it removes are precisely the ones other compilers never had. It also catches a category of genuine bugs in pre-C++11 code.

What breaks first, in rough order of frequency.

Two-phase name lookup. This is the big one and the reason legacy template code fails immediately. Under /permissive-, the compiler parses templates properly and identifies dependent and non-dependent names. Calling an inherited member from a dependent base without qualification stops working: inside template<class T> struct D : T { void f() { g(); } }, the call to g() is now C3861 identifier not found. The fixes are this->g(), T::g(), or a using declaration; for a dependent type you need typename and possibly the template keyword. VS 2017 15.7 extended this to argument-dependent lookup binding in the definition context. If you need the old behaviour temporarily while keeping the rest, /Zc:twoPhase- exists.

Conditional operator ambiguity. Under /Zc:ternary the compiler applies the standard rules, and a class that provides both a converting constructor from T and a conversion operator to T now makes cond ? someT : theClass ambiguous. Typical diagnostics are C2593 operator ? is ambiguous and C2446. The fix is an explicit cast on one arm.

String literal conversions. /Zc:strictStrings stops const char* literals converting to char*, which breaks a lot of old Windows code that passes literals to BSTR or LPSTR parameters.

Qualified names in member declarations, initializing more than one union member in a constructor initializer list, using default as an identifier, for each in native code, scoped enums used as array bounds, and ATL attribute syntax all become errors or warnings.

Hidden friend lookup. Under the conforming rules, a friend declared only inside a class is found only through argument-dependent lookup. Taking its address, or calling it with nullptr instead of a typed pointer, no longer finds it. /Zc:hiddenFriend- restores the old behaviour independently.

The practical adoption path. Turn it on per project, not globally. New code gets it from the start. Legacy projects get it when someone has time to fix two-phase lookup properly rather than by adding /Zc:twoPhase- and forgetting. Note that older Windows SDK headers were not clean under /permissive-; anything before the Fall Creators Update SDK (10.0.16299.0) is likely to fail, and even the April 2018 SDK had specific WRL and user-mode headers with known issues, so being on a current SDK is a prerequisite rather than a nice-to-have.`,
      },
      {
        question: 'An application fails to start on a customer machine with a missing-DLL or 0xc000007b error. How do you diagnose it?',
        answer: `Two distinct failures hide behind that description, and the first job is to tell them apart.

0xc000007b is STATUS_INVALID_IMAGE_FORMAT and almost always means an architecture mismatch: a 64-bit process trying to load a 32-bit DLL or the reverse. A plain "the specified module could not be found" means a dependency is genuinely absent from the search path. The diagnosis differs.

Step 1 — inspect what the binary actually wants.

    dumpbin /headers app.exe        # machine type: x64 or x86
    dumpbin /dependents app.exe     # direct imports
    dumpbin /imports app.exe        # imports with the function names

dumpbin is link.exe /dump under another name, so it is present in any developer command prompt. Check the machine type of the EXE and of every DLL you ship next to it. A single 32-bit DLL in a 64-bit install directory produces 0xc000007b and nothing more informative.

Step 2 — trace the actual load, not the static list. Static analysis misses two things: DLLs loaded with LoadLibrary at runtime, and delay-loaded imports. Both are common in plugin architectures and both fail long after startup.

Dependency Walker (depends.exe) is the tool everyone remembers and it has been misleading for a decade, because it reports the API set virtual DLLs (the api-ms-win-core-* names) as missing when they are perfectly normal. The modern replacement is Dependencies, which understands API sets and gives an accurate tree. Process Monitor is the ground truth when even that is ambiguous: filter on your process and on CreateFile and NAME NOT FOUND, and you will see every path the loader tried and in what order.

Step 3 — check the usual causes, in order of likelihood.

Missing Visual C++ redistributable. The application imports vcruntime140.dll and msvcp140.dll, which come from the redistributable, not from Windows. The developer machine has them because Visual Studio installed them. The customer machine may not. Either ship the redistributable as a prerequisite in the installer, or use app-local deployment and place the DLLs beside the EXE.

Debug CRT on a customer machine. vcruntime140d.dll, msvcp140d.dll and ucrtbased.dll are not redistributable and are not present on any machine without Visual Studio. If a release build imports any of them, some project in the solution was built with /MDd, which is also a runtime-mismatch bug waiting to happen. Check with dumpbin /dependents and treat any d-suffixed CRT in a release artifact as a build defect.

Architecture mixing. As above: one wrong-bitness DLL in the folder, or a 32-bit plugin loaded by a 64-bit host.

A missing transitive dependency, where the DLL you ship needs another DLL you did not.

Step 4 — decide the deployment model deliberately. App-local deployment (the CRT DLLs next to the EXE) removes the redistributable dependency but means you own patching them when a CVE lands. The redistributable centralises servicing but adds an installer prerequisite. Static linking with /MT removes the question entirely and reintroduces the CRT-mismatch class of problem across every DLL boundary in the product. There is no free option; pick one and make it a product-wide decision.

The check to add to CI so this never reaches a customer: run dumpbin /dependents on the release artifact and fail the build if the import list contains anything not on an approved allowlist. It is a five-line script and it catches the debug-CRT case, the accidental new dependency case, and the wrong-architecture case before shipping.`,
      },
    ],
    references: [
      'https://learn.microsoft.com/en-us/cpp/c-runtime-library/crt-library-features',
      'https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line',
      'https://learn.microsoft.com/en-us/cpp/build/reference/permissive-standards-conformance',
      'https://learn.microsoft.com/en-us/cpp/build/reference/z7-zi-zi-debug-information-format',
      'https://learn.microsoft.com/en-us/cpp/build/exporting-from-a-dll-using-declspec-dllexport',
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // 7. Windows and Linux System Libraries
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-win-vs-posix',
    title: 'Windows and Linux System Libraries',
    icon: 'columns',
    color: '#ea580c',
    questions: 5,
    description: 'Where Win32 and POSIX genuinely diverge — process creation, threading, dynamic loading, paths, file semantics, sockets — and how to structure a codebase so platform code is isolated rather than scattered across ifdefs.',
    visualizations: [
      {
        title: 'Win32 and POSIX side by side: the primitives that actually differ',
        image: '/diagrams/devops/nb-7-win-vs-posix.png',
        description: `Most cross-platform C++ breakage is not language-level. The compilers agree far more than the operating systems do. The divergence lives in the system library layer, and it is concentrated in seven places.

Process creation:

POSIX splits creation from execution. fork() clones the calling process, returning 0 in the child and the child PID in the parent; the child then calls one of the exec family (execve, execvp) to replace its image. Between the fork and the exec the child is a full copy of the parent, which is exactly where you set up redirection: dup2 the pipe ends onto fd 0/1/2, close what the child should not inherit, chdir, setuid. posix_spawn packages the common cases without an explicit fork.

Windows has no fork. CreateProcess does creation and execution in one call. Redirection is done up front by filling in a STARTUPINFO with hStdInput, hStdOutput, hStdError plus STARTF_USESTDHANDLES, and inheritance is a per-handle property combined with the bInheritHandles flag. Two details bite people: lpCommandLine must be a writable buffer because CreateProcessW may modify it in place, and quoting is the caller's problem — Windows passes a single command-line string and each CRT re-parses it, so argv round-tripping is lossy in a way execv never is. Microsoft's guidance is to leave bInheritHandles FALSE unless the child genuinely needs handles, and when it does, use STARTUPINFOEX with UpdateProcThreadAttribute(PROC_THREAD_ATTRIBUTE_HANDLE_LIST) to whitelist exactly the handles you intend to pass.

Threading:

pthreads gives you pthread_create/pthread_join/pthread_mutex_t/pthread_cond_t. Win32 gives you CreateThread (or _beginthreadex when the CRT is involved), WaitForSingleObject, CRITICAL_SECTION, SRWLOCK and CONDITION_VARIABLE. std::thread, std::mutex and std::condition_variable are thin wrappers over whichever is native: libstdc++ and libc++ sit on pthreads, MSVC's STL sits on the Win32 synchronization primitives. What leaks through is everything the standard did not specify — thread naming, priority, affinity, stack size, and cancellation. There is no portable std::thread stack size. There is no portable thread name. native_handle() exists precisely so you can drop to pthread_setname_np or SetThreadDescription, and that call site is platform code by definition.

Dynamic loading:

dlopen/dlsym/dlclose/dlerror versus LoadLibrary/GetProcAddress/FreeLibrary. The shapes rhyme; the semantics do not. POSIX dlopen takes RTLD_LAZY or RTLD_NOW for relocation timing and RTLD_GLOBAL or RTLD_LOCAL for symbol visibility, and the global namespace means a symbol from one .so can satisfy a relocation in another. Windows has no equivalent of RTLD_GLOBAL: every DLL resolves its imports through its own import table, and symbols are not exported at all unless you mark them with __declspec(dllexport) or list them in a .def file. That single fact is why "it links on Linux and fails on Windows with unresolved external symbol" is the most common porting bug in a shared-library build.

Paths and the filesystem:

Backslash is the Windows separator, though the Win32 file APIs convert forward slashes on the way to NT-style names — except behind the \\\\?\\ prefix, where no normalization happens at all. Windows has drive letters and per-drive current directories; POSIX has one root. MAX_PATH is 260 characters; the extended-length \\\\?\\ prefix raises that to roughly 32767, and since Windows 10 1607 a process can opt into long paths by setting HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\FileSystem LongPathsEnabled to 1 (REG_DWORD) and declaring ws2:longPathAware in the application manifest. Both conditions are required. NTFS is case-preserving but case-insensitive by default; ext4 is case-sensitive. A repository that contains both Util.h and util.h builds on Linux and is corrupt on checkout on Windows.

Text mode, locking, and sockets:

The Windows CRT opens files in text mode by default, translating LF to CRLF on write and CRLF to LF on read, and historically treating Ctrl+Z as end of file. Any binary read must pass "b" to fopen or call _setmode(fd, _O_BINARY); _fmode or _set_fmode changes the process default. POSIX has one mode. File locking differs even more consequentially for build tools: Windows share modes are mandatory, so an open handle without FILE_SHARE_DELETE blocks unlink and rename, while POSIX unlink always succeeds and the inode simply lives until the last descriptor closes. That is why a Windows build fails with "Access is denied" when an antivirus scanner or a stale compiler process still holds an output file, and why atomic replace on Windows means ReplaceFile or MoveFileEx with MOVEFILE_REPLACE_EXISTING rather than a plain rename over an open file.

Sockets are BSD-shaped on Windows but not BSD. You must call WSAStartup before any socket call and WSACleanup after; a socket is a SOCKET, not an int, and INVALID_SOCKET is not -1; you close it with closesocket, not close; errors come from WSAGetLastError, not errno; and there is no reliable select on file descriptors that are not sockets. Time and locale diverge too: CLOCK_MONOTONIC versus QueryPerformanceCounter, gmtime_r versus gmtime_s with reversed argument order, and a Windows locale model that is not the POSIX one.`,
      },
      {
        title: 'Quick-fire interview answers — Windows vs POSIX',
        description: `Q: Windows has no fork. What is the practical consequence for a codebase that shells out?
A: You cannot write "set up the child state, then exec" as straight-line code. On Windows every child attribute — redirected handles, working directory, environment, inheritance set — must be assembled before the single CreateProcess call, in STARTUPINFO or STARTUPINFOEX. Anything you would have done between fork and exec has to become a parameter. In practice that means the process-spawn abstraction in your codebase must be a descriptor struct rather than a callback, because a callback has nowhere to run on Windows.

Q: Does std::thread give you a fully portable threading story?
A: No. It portably covers creation, joining, detaching, and the standard mutex and condition variable types. It does not cover stack size, thread naming, priority, affinity, or cancellation, and those are exactly the things that show up in production tuning and in crash dumps. native_handle() is the escape hatch: pthread_setname_np on Linux, SetThreadDescription on Windows. Treat those call sites as platform code and put them behind one function.

Q: Why does a shared library that links cleanly on Linux fail to link on Windows?
A: ELF exports every non-static symbol by default; a Windows DLL exports nothing unless it is marked __declspec(dllexport) or listed in a .def file. So a Linux build never forces you to declare your public surface, and the Windows build does. The standard fix is a generated export macro — dllexport when building the library, dllimport when consuming it, and empty or __attribute__((visibility("default"))) elsewhere — combined with building Linux with -fvisibility=hidden so both platforms enforce the same surface.

Q: A build tool intermittently fails on Windows with "Access is denied" deleting an output file. What is going on?
A: Windows share modes are mandatory. If any process holds a handle opened without FILE_SHARE_DELETE, unlink and rename on that file fail. Antivirus scanners, search indexers, and a compiler process that has not fully exited are the usual culprits. On POSIX the same sequence works because unlink only removes the directory entry and the inode survives until the last descriptor closes. Fixes: open with FILE_SHARE_DELETE, use MoveFileEx with MOVEFILE_REPLACE_EXISTING for atomic replacement, and add bounded retry with backoff around delete and rename in the build tool itself.

Q: What is the right structure for platform-specific code?
A: One narrow interface per capability — process, filesystem, dynamic library, thread naming, time — declared in a header with no platform types in it, and two implementation files, one per platform, selected by the build system rather than by preprocessor conditionals inside a shared file. The rule is that ifdefs live in the build graph and in a handful of leaf .cpp files, never sprinkled through business logic. When the surface is large enough that hand-rolling is a liability, adopt Qt Core, Boost.Filesystem/Boost.Process, ASIO, or APR rather than growing your own.`,
      },
    ],
    introduction: `Cross-platform C++ rarely breaks at the language level. Both MSVC and GCC/Clang implement the same standard, and since C++17 the standard library covers filesystem paths, threads, and time reasonably well. What breaks is the layer beneath: the system libraries. Win32 and POSIX were designed from different premises, and where they differ they differ structurally, not cosmetically.

The single largest divergence is process creation. POSIX separates creation from execution — fork() duplicates the process, and the child then execs a new image. Everything you need to configure about the child happens in ordinary code between those two calls. Windows fuses them into CreateProcess and requires the entire child configuration to be expressed declaratively up front, in STARTUPINFO or STARTUPINFOEX. A portable spawn abstraction therefore has to look like the Windows one, because the POSIX side can express the Windows shape but not the reverse.

Threading is closer than people expect. std::thread, std::mutex, and std::condition_variable map cleanly onto pthreads on Linux and onto SRWLOCK, CONDITION_VARIABLE, and the Win32 thread APIs on Windows. What is not portable is everything outside the standard: stack size, thread names, affinity, priority, and cancellation. Those matter in production, and they are exactly what an interviewer probes when you claim your code is portable.

Dynamic loading is where the model, not just the spelling, differs. dlopen and LoadLibrary look alike, but ELF exports all non-static symbols by default while a Windows DLL exports nothing without __declspec(dllexport) or a .def file, and Windows has no analogue of RTLD_GLOBAL. This asymmetry is the root cause of the classic "builds on Linux, unresolved external symbol on Windows" failure, and the fix is an export-macro discipline plus -fvisibility=hidden so Linux enforces the same contract.

Filesystem semantics cause the failures that are hardest to reproduce. Drive letters and per-drive current directories, backslash separators, MAX_PATH at 260 characters with a two-part opt-in for long paths, NTFS case-insensitivity against a case-sensitive ext4, CRLF translation in the CRT default text mode, and — most disruptive for build tooling — mandatory share modes that make delete and rename fail while a handle is open. Nearly every "the build is flaky on Windows only" bug traces to one of those.

Sockets are a case of familiar shapes with unfamiliar rules: WSAStartup is mandatory, a SOCKET is not an int, INVALID_SOCKET is not -1, closesocket is not close, and errors come from WSAGetLastError rather than errno.

The interview question underneath all of this is architectural, not trivia: given these differences, how do you structure a codebase? The answer an interviewer wants is that platform code is isolated behind narrow interfaces, implemented once per platform in files selected by the build system, and that you reach for a mature portability layer — Qt Core, Boost, ASIO, APR — when the surface is wide enough that maintaining your own shim becomes the product. The wrong answer is ifdefs woven through business logic, which is untestable, uncompilable on the platform you are not currently on, and rots silently.`,
    whenToUse: [
      'Porting an existing Linux-only service or tool to Windows, or the reverse, where the language is already portable but the system calls are not',
      'Designing a build tool, package manager, or agent that manipulates files and spawns processes on both platforms — the layer where locking and path semantics dominate',
      'Writing a plugin host or extension system that must load shared objects at run time on both platforms',
      'Choosing between hand-rolling a portability shim and adopting Qt Core, Boost, ASIO, or APR for a long-lived codebase',
      'Debugging failures that reproduce on exactly one platform: unresolved external symbols, Access is denied on delete, or path-length errors during checkout',
    ],
    keyConcepts: [
      {
        term: 'Win32 API',
        definition: 'The C-level Windows system interface: kernel32, advapi32, ws2_32 and friends. Object-handle based (HANDLE), wide-character first (the W suffix functions), and error reporting through GetLastError rather than errno. Documented under learn.microsoft.com/windows/win32.',
      },
      {
        term: 'POSIX',
        definition: 'The Open Group and IEEE standard that defines the Unix system interface — fork, exec, open, read, pthread_create, dlopen, BSD sockets. Linux, macOS, and the BSDs implement it with local extensions. Errors are reported through errno.',
      },
      {
        term: 'CreateProcess vs fork/exec',
        definition: 'CreateProcess is a single call that takes the entire child specification declaratively (STARTUPINFO, inheritance flags, environment block, working directory). fork/exec is two calls with arbitrary code between them. The declarative form is the portable common denominator, so design your abstraction that way.',
      },
      {
        term: 'HANDLE vs file descriptor',
        definition: 'A Windows HANDLE is an opaque kernel-object reference used for files, processes, threads, events, mutexes, and pipes; inheritance is a per-handle attribute set at creation. A POSIX file descriptor is a small integer that is inherited unless FD_CLOEXEC is set. Sockets on Windows are SOCKET values, not descriptors, and do not interoperate with the CRT file API.',
      },
      {
        term: 'Export visibility asymmetry',
        definition: 'ELF shared objects export every non-static symbol by default; Windows DLLs export nothing unless marked __declspec(dllexport) or listed in a .def file. Building Linux with -fvisibility=hidden and using a generated export macro makes both platforms enforce the same public surface at build time instead of at link time on Windows only.',
      },
      {
        term: 'MAX_PATH and long-path opt-in',
        definition: 'The Windows API path limit is 260 characters. The \\\\?\\ prefix raises it to roughly 32767 but disables all path normalization (no forward slashes, no dot or dot-dot). Since Windows 10 1607 a process may opt into long paths for many Win32 file functions by setting the LongPathsEnabled REG_DWORD to 1 under Control\\FileSystem and adding ws2:longPathAware to the application manifest. Both are required; relative paths remain capped at MAX_PATH.',
      },
      {
        term: 'Mandatory share modes',
        definition: 'Windows enforces sharing at open time. A handle opened without FILE_SHARE_DELETE prevents deletion and rename of that file for as long as it lives, so an antivirus scanner or a lingering compiler process makes a build step fail with Access is denied. POSIX unlink always succeeds and the inode persists until the last descriptor closes. This single difference accounts for most Windows-only build-tool flakiness.',
      },
      {
        term: 'Winsock initialization',
        definition: 'Windows sockets require WSAStartup before any socket call and WSACleanup at shutdown. A socket is a SOCKET, the failure value is INVALID_SOCKET rather than -1, the close call is closesocket, and errors come from WSAGetLastError. BSD sockets need none of this, which is why naive ports compile and then fail at the first socket() call.',
      },
    ],
    approach: [
      'Inventory the actual platform surface before writing any shim — grep for fork, exec, dlopen, pthread_, WSAStartup, CreateProcess, and raw path string manipulation, and list the distinct capabilities rather than the distinct call sites',
      'Define one narrow interface per capability (process spawn, filesystem, dynamic library, thread attributes, monotonic clock) in a header that mentions no platform type — no HANDLE, no pid_t, no SOCKET',
      'Implement each interface twice, in process_win32.cpp and process_posix.cpp, and select the file in the build system rather than wrapping the body in preprocessor conditionals',
      'Model the process API on the Windows shape (a spawn descriptor struct) because POSIX can express it and the reverse is not true',
      'Adopt std::filesystem::path for all path handling and never concatenate separators by hand; add an explicit long-path and case-collision check to CI on the Windows runner',
      'Decide explicitly whether to hand-roll or adopt Qt Core, Boost.Process and Boost.Filesystem, standalone ASIO, or APR — and record the decision, because the cost of a half-finished in-house shim is paid on every future port',
      'Run the full test suite on both platforms in CI from day one; a portability layer that is only exercised on the developer platform is not a portability layer',
    ],
    pitfalls: [
      'Scattering ifdef _WIN32 through business logic instead of isolating it in leaf files — the branch you are not building never compiles, so it rots until the day someone needs it',
      'Assuming a shared library that links on Linux will link on Windows, because ELF exports everything by default and DLLs export nothing without dllexport or a .def file',
      'Passing a string literal or const buffer as lpCommandLine to CreateProcessW — the Unicode version may write into that buffer in place, which is an access violation',
      'Reading binary data through a CRT stream opened in the default text mode on Windows — LF becomes CRLF on write, CRLF collapses on read, and historically Ctrl+Z truncates the read',
      'Treating delete and rename as infallible in a build tool on Windows; mandatory share modes make them fail while any handle is open, and the fix is FILE_SHARE_DELETE plus MoveFileEx with MOVEFILE_REPLACE_EXISTING plus bounded retry',
      'Committing two files whose names differ only in case — the repository is valid on ext4 and cannot be checked out correctly on a default NTFS or APFS volume',
      'Porting BSD socket code without WSAStartup and without replacing close, errno, and the -1 failure test — it compiles cleanly and fails at run time on the first call',
    ],
    keyQuestions: [
      {
        question: 'Windows has no fork(). How do you design a process-spawning abstraction that works on both platforms?',
        answer: `The key insight is that the two models are not symmetric in expressiveness, so the abstraction has to be shaped like the more restrictive one.

On POSIX, fork() returns twice. Everything you want to configure about the child — redirecting file descriptors with dup2, closing inherited descriptors, chdir, setuid, setting resource limits, blocking signals — is ordinary code executed in the child between fork and exec. It is a callback in effect: arbitrary logic runs in the child's address space before the image is replaced.

On Windows, CreateProcess creates and executes in one call. There is no moment where you are running as the child. Every attribute must be supplied as a parameter: redirection through STARTUPINFO's hStdInput/hStdOutput/hStdError with the STARTF_USESTDHANDLES flag, the environment through lpEnvironment, the working directory through lpCurrentDirectory, the inherited handle set through bInheritHandles and, for precision, STARTUPINFOEX with UpdateProcThreadAttribute(PROC_THREAD_ATTRIBUTE_HANDLE_LIST).

So the portable abstraction is a descriptor struct, never a callback:

\`\`\`cpp
struct SpawnRequest {
  std::filesystem::path              executable;
  std::vector<std::string>           args;        // argv-shaped, not a joined string
  std::optional<std::filesystem::path> cwd;
  std::vector<std::pair<std::string, std::string>> env;
  Redirect stdin_, stdout_, stderr_;              // Inherit | Null | Pipe | File
  bool inherit_other_handles = false;
};

Result<Process> spawn(const SpawnRequest&);
\`\`\`

The POSIX implementation translates the struct into fork/exec (or posix_spawn with file actions). The Windows implementation translates it into STARTUPINFOEX plus CreateProcessW. Had you designed the interface as spawn(argv, child_setup_callback), the Windows side would have had nowhere to run the callback.

Three details that separate a working implementation from a demo:

Argument quoting. POSIX exec takes a real argv array; the kernel never re-parses it. Windows passes one command-line string that each CRT re-parses with its own rules, so you must build the string using the documented MSVCRT quoting algorithm — backslashes are only special immediately before a quote — and you must accept that argv round-tripping is lossy. Keep args as a vector and do the joining in one audited function on the Windows side.

lpCommandLine mutability. CreateProcessW may modify that buffer in place, so pass a writable std::wstring buffer, never a literal or a const pointer.

Inheritance. On POSIX the default is that descriptors are inherited, so you open everything with O_CLOEXEC and explicitly un-set it for the ones the child needs. On Windows the default is not inherited, so you explicitly mark the handles you want passed and, per Microsoft's guidance, keep bInheritHandles FALSE unless the child needs handles — and when it does, use the explicit handle list attribute instead of inheriting everything.

The failure mode of not doing this: pipes that never close, so the parent's read blocks forever waiting for EOF that will not come because a duplicate write end is still open in some other child.`,
      },
      {
        question: 'How does std::thread map onto Windows threads and pthreads, and what leaks through the abstraction?',
        answer: `std::thread is a thin wrapper. On Linux with libstdc++ or libc++ it is pthread_create plus pthread_join. On Windows with the Microsoft STL it sits on the Win32 thread APIs; historically _beginthreadex, so the CRT's per-thread state is initialized correctly. std::mutex maps to pthread_mutex_t on POSIX and to SRWLOCK or a critical-section-like primitive on Windows. std::condition_variable maps to pthread_cond_t and to CONDITION_VARIABLE.

What the standard covers portably: creation, joining, detaching, hardware_concurrency as a hint, mutexes, recursive mutexes, shared mutexes, condition variables, futures, atomics, and since C++20 jthread with cooperative cancellation via stop_token.

What leaks through, and matters in production:

Stack size. There is no portable way to set it. pthread_attr_setstacksize on POSIX; the dwStackSize parameter of CreateThread on Windows, where it is a reserve size and the actual commit grows on demand. A recursive algorithm tuned against Linux's 8 MiB default will overflow on Windows' 1 MiB default. If you need a specific stack size, you cannot use std::thread — you construct the thread natively and wrap it.

Thread naming. Nothing in the standard. pthread_setname_np on Linux, capped at 16 bytes including the terminator. SetThreadDescription on Windows, which is what shows up in a debugger and in a crash dump. This is the single most valuable non-portable call in a server codebase, because a dump with named threads is diagnosable and one with "Thread 14" is not.

Affinity and priority. sched_setaffinity and pthread_setschedparam on Linux; SetThreadAffinityMask, SetThreadPriority, and the Windows scheduling classes. The semantics of priority are not comparable across the two — Linux nice values and real-time policies do not map to Windows priority levels.

Cancellation. pthread_cancel with cancellation points exists on POSIX and has no Windows equivalent worth using (TerminateThread is unsafe: it does not unwind, run destructors, or release locks). The portable answer has always been cooperative cancellation, and C++20 standardized it as std::stop_token and std::jthread. Never build a design that needs to kill a thread.

Thread-local storage. thread_local is standard, but the interaction with dynamically loaded libraries is not. On Windows, thread_local in a DLL loaded via LoadLibrary after threads already exist has historically had initialization caveats; on Linux, TLS models (initial-exec versus global-dynamic) affect whether a .so can be dlopened at all.

native_handle() exists exactly so you can drop down. The right pattern is one function per platform-specific attribute, in the platform leaf file:

\`\`\`cpp
void set_current_thread_name(const char* name);  // one decl, two impls
\`\`\`

Answering "std::thread makes threading portable" with no qualification is the weak answer. The strong answer names stack size, naming, and cancellation as the three things that force you to the native handle, and notes that jthread and stop_token removed cancellation from that list.`,
      },
      {
        question: 'A build tool works on Linux and intermittently fails on Windows deleting or replacing output files. Diagnose it.',
        answer: `The symptom is ERROR_ACCESS_DENIED (5) or ERROR_SHARING_VIOLATION (32) on DeleteFile, MoveFile, or an open with truncation. The cause is that Windows file sharing is mandatory and POSIX file sharing is advisory.

On POSIX, unlink removes a directory entry. If some process still has the file open, the inode survives until the last descriptor closes; the unlink itself always succeeds. rename over an existing file is atomic and also succeeds regardless of open handles. This is why "write to temp, rename over the target" is the universal atomic-write idiom on Linux and why build tools written there never think about it.

On Windows, every CreateFile call declares a share mode. If a handle is open without FILE_SHARE_DELETE, no one can delete or rename that file until the handle closes. If it is open without FILE_SHARE_WRITE, no one can open it for writing. The processes holding those handles are usually not yours:

- Antivirus and endpoint-protection agents open every newly written file to scan it. Defender does this on the write-completion path, so the window is short but real, which is exactly why the failure is intermittent rather than deterministic.
- The search indexer opens files under indexed directories.
- A compiler or linker process that has "exited" from your perspective but whose handles the kernel has not yet reaped.
- Your own tool, if a std::ifstream or a memory mapping is still alive on a path you are about to replace. A file mapping is worse than a handle: a mapped section blocks deletion until the view is unmapped and the section handle closed.

The fixes, in order of preference:

1. Open with FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE for anything the build might later replace. This makes your own handles stop being the problem. Note that the CRT's fopen does not give you this; you need CreateFileW directly or _sopen_s with the sharing flag.

2. Replace atomically instead of deleting then creating. MoveFileExW with MOVEFILE_REPLACE_EXISTING is the atomic same-volume replace. ReplaceFileW additionally preserves the destination's attributes, ACLs, and streams, which matters when the target is a signed or ACLed artifact. Neither works across volumes, so keep the temp file in the destination directory, not in TEMP.

3. Add bounded retry with backoff around delete and rename. This is not a hack; it is the documented mitigation for scanner interference, and every serious Windows build system does it. Retry on ERROR_ACCESS_DENIED and ERROR_SHARING_VIOLATION only, cap at a few hundred milliseconds total, and log the final failure with the path so it is diagnosable.

4. Diagnose the actual holder before guessing. Sysinternals handle.exe or Process Explorer's Find Handle will name the process holding the path. Resource Monitor's Associated Handles search does the same without an install.

5. As a delete-on-close alternative, open with FILE_FLAG_DELETE_ON_CLOSE so the file disappears when the last handle drops. This is close to POSIX unlink-while-open semantics but only for files you created.

The interview signal here is knowing that this is a semantic difference and not a permissions bug. Candidates who reach for "run the build as Administrator" or "add an exclusion to antivirus" are treating a symptom; the correct answer is share flags, atomic replace, and retry.`,
      },
      {
        question: 'Walk through the path and filename differences that break cross-platform code.',
        answer: `Separator. Backslash on Windows, forward slash on POSIX. The Win32 file APIs accept forward slashes and convert them to backslashes on the way to NT-style names, with one exception: behind the \\\\?\\ prefix no conversion happens at all, so forward slashes there are literal filename characters and the open fails. Do not hand-build paths with string concatenation; std::filesystem::path handles the separator, and operator/ is the append.

Roots and drives. POSIX has one root. Windows has per-drive roots (C:\\, D:\\) plus UNC roots (\\\\server\\share). Worse, Windows maintains a current directory per drive, so "C:foo" is relative to the current directory of C:, not to the process CWD. Any code that assumes "a path either starts with a separator or is relative to one CWD" is wrong on Windows. std::filesystem::path exposes this correctly via root_name(), root_directory(), and is_absolute().

Length. MAX_PATH is 260 characters including the drive, separators, and the terminating null. Directory creation is further limited to MAX_PATH minus 12 so an 8.3 name can be appended. The \\\\?\\ prefix raises the ceiling to approximately 32767 with a per-component limit that is usually 255. Since Windows 10 1607 an application can opt out of MAX_PATH for many common file and directory functions, but two conditions must both hold: the registry value HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\FileSystem LongPathsEnabled must exist and be 1 (REG_DWORD), and the application manifest must contain the ws2:longPathAware element set to true. The registry value is cached per process on first use of an affected function, so a reboot may be needed for already-running processes. Relative paths are always capped at MAX_PATH regardless. This is why deep node_modules trees and long CI workspace prefixes break checkouts on Windows and nowhere else.

Case. NTFS is case-preserving and case-insensitive by default; ReFS and APFS are typically case-insensitive too; ext4 is case-sensitive. Two consequences. First, a repository containing Util.h and util.h cannot be checked out correctly on Windows or default macOS. Second, an include of "MyHeader.h" for a file named "myheader.h" compiles on Windows and fails on Linux, so CI on Linux is what catches it. Neither platform will warn you.

Reserved names and characters. Windows forbids the characters < > : " | ? * and control characters in filenames, forbids trailing spaces and trailing dots, and reserves the device names CON, PRN, AUX, NUL, COM1 through COM9, and LPT1 through LPT9 — including with an extension, so "aux.txt" is still reserved. POSIX forbids only the null byte and the separator. A tarball or artifact naming scheme that is legal on Linux can be unpackable on Windows.

Normalization. Windows treats path and filename strings as an opaque sequence of WCHARs and performs no Unicode normalization; macOS APFS is case-insensitive and historically normalized differently from Linux. A filename containing a composed versus decomposed accented character can be one file on one platform and two on another.

Encoding. Win32 W functions take UTF-16; the A functions go through the active code page and should not be used. POSIX paths are byte strings with no declared encoding, conventionally UTF-8. std::filesystem::path stores wchar_t on Windows and char on POSIX, which is why path::string() can throw or lose information and path::u8string() exists.

Symlinks and junctions. Creating a symlink on Windows historically required SeCreateSymbolicLinkPrivilege, and only since Windows 10 Creators Update with Developer Mode enabled can an unprivileged process create one. Code that creates symlinks as part of a build must have a fallback (copy, or a directory junction) rather than assuming success.`,
      },
      {
        question: 'How do you structure a codebase so platform code is isolated rather than ifdef-scattered, and when do you adopt a portability layer?',
        answer: `The structural rule is that preprocessor conditionals belong in the build graph and in a small number of leaf translation units, never in the middle of business logic.

The layout that holds up:

\`\`\`
src/
  platform/
    process.h              // no HANDLE, no pid_t, no SOCKET in this header
    process_posix.cpp
    process_win32.cpp
    dynlib.h
    dynlib_posix.cpp
    dynlib_win32.cpp
    thread_attrs.h
    thread_attrs_posix.cpp
    thread_attrs_win32.cpp
  core/                    // zero platform conditionals below this line
\`\`\`

The build system selects the implementation file, not the preprocessor:

\`\`\`cmake
add_library(platform STATIC platform/process.h platform/dynlib.h)
if(WIN32)
  target_sources(platform PRIVATE platform/process_win32.cpp platform/dynlib_win32.cpp)
else()
  target_sources(platform PRIVATE platform/process_posix.cpp platform/dynlib_posix.cpp)
endif()
\`\`\`

Why this beats ifdefs inside a shared file. An ifdef branch you are not compiling is not parsed, so it accumulates syntax errors, stale API usage, and unreferenced variables that nobody sees until someone builds on the other platform six months later. Separate files at least fail loudly when their platform is built, and they can be reviewed as coherent units. They are also testable: you can write a contract test suite against the interface and run it identically on both platforms in CI.

Two additional rules that matter as much as the file layout. First, no platform types in the public header — if process.h mentions HANDLE, every consumer transitively includes windows.h and inherits its macros (min, max, GetMessage, DeleteFile expanding to DeleteFileW). Use an opaque handle type or a pimpl. Second, the interface is shaped by the most restrictive platform, so the process API is a descriptor struct rather than a fork-style callback.

When to adopt an existing layer instead:

Qt Core, if you already have Qt or want the widest surface in one dependency — QProcess, QFile, QDir, QThread, QLibrary, QDateTime, plus signals and an event loop. The cost is a large dependency with its own build and licensing model (LGPL or commercial), and Qt types tend to spread through the codebase.

Boost, when you want a la carte coverage. Boost.Filesystem is the ancestor of std::filesystem and is now largely redundant on C++17. Boost.Process covers spawning, pipes, and async child I/O and is the single highest-value piece for the fork/CreateProcess problem. Boost.Interprocess covers shared memory and named synchronization. Header-heavy but no runtime dependency for most components.

ASIO (standalone or Boost.Asio), for networking specifically. It hides Winsock initialization, the SOCKET/int split, closesocket, WSAGetLastError, and the IOCP versus epoll reactor difference behind one asynchronous model. If your portability problem is mostly sockets and timers, this is the answer; do not hand-roll it.

APR (Apache Portable Runtime), a C-level layer covering processes, files, sockets, threads, memory pools, and DSO loading. Battle-tested, used by httpd and Subversion, but a pool-based C API that sits awkwardly in modern C++.

A thin in-house shim, when the surface is genuinely small — spawn a child, load a plugin, name a thread, get a monotonic clock. Perhaps 500 to 1500 lines. The failure mode is scope creep: the day you start implementing async pipe I/O or a socket reactor by hand, you have started writing ASIO badly, and you should have adopted it.

The decision rule to state in an interview: count the distinct capabilities, not the call sites. Under about five narrow capabilities, write the shim and keep it under contract tests. Above that — especially once networking or async child I/O is involved — take the dependency, because a half-finished in-house portability layer is a permanent tax paid by every future engineer on the project.`,
      },
    ],
    references: [
      'https://learn.microsoft.com/en-us/windows/win32/procthread/creating-processes',
      'https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation',
      'https://learn.microsoft.com/en-us/windows/win32/dlls/using-run-time-dynamic-linking',
      'https://learn.microsoft.com/en-us/cpp/c-runtime-library/text-and-binary-mode-file-i-o',
      'https://pubs.opengroup.org/onlinepubs/9799919799/functions/dlopen.html',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 8. GNU Make and gmake
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-make',
    title: 'GNU Make and gmake',
    icon: 'settings',
    color: '#ea580c',
    questions: 6,
    description: 'The dependency-graph and timestamp model that still underlies almost every C and C++ build, plus the rules, automatic variables, parallelism hazards, and debugging flags an interviewer expects you to know cold.',
    visualizations: [
      {
        title: 'The make dependency graph: rules, automatic variables, and the rebuild decision',
        image: '/diagrams/devops/nb-8-make.png',
        description: `make is a graph engine with one decision rule. Every target is a node, its prerequisites are edges, and a target is rebuilt when it does not exist or when any prerequisite has a newer modification time. Everything else in GNU Make — pattern rules, functions, variable flavors, parallelism — is machinery for describing that graph compactly.

Rule forms:

An explicit rule names its target and prerequisites literally. A pattern rule uses % as a stem: %.o: %.cpp matches any object file whose stem has a matching source. Implicit rules are the built-in catalogue make ships with (it already knows how to make .o from .c using CC and CFLAGS), which is convenient in toy makefiles and a source of surprise in real ones — a stray built-in rule can fire when your intended rule does not match, which is why serious makefiles run with MAKEFLAGS including -r to disable built-in rules and -R to disable built-in variables.

Automatic variables, set per-recipe by make:

  $@   the file name of the target
  $<   the name of the first prerequisite
  $^   all prerequisites, duplicates removed, order-only excluded
  $+   all prerequisites, duplicates preserved in listed order (for link lines)
  $?   the prerequisites newer than the target
  $*   the stem matched by the pattern rule
  $|   the order-only prerequisites
  $%   the member name when the target is an archive member

Each has D and F variants for the directory and file parts: $(@D) and $(@F).

Order-only prerequisites live after a pipe: target: normal-deps | order-only-deps. They must exist before the target is built but their timestamps never trigger a rebuild. The canonical use is a build directory, which changes mtime on every write and would otherwise force a full rebuild.

Special targets that change semantics:

  .PHONY        names targets that are actions, not files. Without it, a file named "clean" silently disables make clean.
  .DELETE_ON_ERROR  deletes a target whose recipe exited nonzero. Not the default, which is why an interrupted compile can leave a truncated .o that make then considers up to date.
  .SECONDARY    marks intermediates that make must not auto-delete, avoiding rebuild churn.
  .INTERMEDIATE marks files make may delete after use.
  .ONESHELL     runs the whole recipe in a single shell invocation instead of one shell per line.
  .NOTPARALLEL  forces serial execution even under -j.
  .PRECIOUS     keeps a target if make is interrupted.
  .SUFFIXES     the old suffix-rule list; clearing it is part of turning off built-ins.

Variable flavors:

  =    recursively expanded — the right-hand side is re-evaluated every time the variable is used
  :=   simply expanded — evaluated once, at the point of assignment
  ?=   assign only if not already defined
  +=   append, inheriting the flavor of the original assignment
  !=   assign the output of a shell command (equivalent to := $(shell ...))

Recursive expansion bites in two ways. CFLAGS = $(CFLAGS) -O2 is an infinite recursion that make detects and rejects. And VERSION = $(shell git describe) with a recursive flavor runs git on every single reference, which in a large makefile can mean hundreds of forks; := runs it once.

Automatic header dependencies:

Hand-written header prerequisites are always wrong eventually. The compiler already knows them, so let it emit them: -MMD writes a .d file listing the target's header prerequisites (excluding system headers; -MD includes them), and -MP adds a phony target for each header so that deleting a header does not produce "No rule to make target". You then -include the .d files, and make silently ignores them on the first build when they do not yet exist.

Parallelism:

-j N runs up to N recipes concurrently, and a recursive make invocation coordinates with the parent through the jobserver so the total job count is respected. Parallel make is a correctness test for your dependency graph: any edge you forgot to declare was previously masked by serial ordering and now becomes a race. --output-sync=target buffers each target's output so interleaved logs stay readable.

Debugging:

  -n            dry run: print recipes without executing
  -p            print the full internal database — every variable, every rule, including built-ins
  -d            full debug trace (very verbose)
  --debug=b,v,i,j,m  selective debug: basic, verbose, implicit, jobs, makefile remaking
  --trace       print each recipe with the file and line that triggered it and why
  $(info ...) / $(warning ...) / $(error ...)   inline diagnostics during parsing`,
      },
      {
        title: 'Quick-fire interview answers — GNU Make',
        description: `Q: What exactly makes make decide to rebuild a target?
A: The target does not exist, or at least one prerequisite has a newer modification time than the target. That is the whole rule. It is not content hashing, not a build ID, not a compiler-flag comparison. Consequences: changing CFLAGS does not trigger a rebuild, a clock skew or a restored-from-backup file with an old mtime silently skips work, and filesystems with coarse mtime granularity can miss a change made within the same tick.

Q: What is the difference between = and := ?
A: With = the right-hand side is recursively expanded, meaning it is re-evaluated every time the variable is referenced. With := it is simply expanded once at assignment. Use := by default. The two classic bites are self-reference (X = $(X) -O2 is an infinite loop make rejects) and $(shell ...) with = , which re-runs the command on every reference.

Q: What are order-only prerequisites and why do you need them?
A: Prerequisites listed after a pipe character. They must be built before the target, but their timestamps do not cause a rebuild. The standard use is a build output directory: a directory mtime changes whenever a file is written into it, so as a normal prerequisite it would force everything to rebuild on every run.

Q: What breaks when you go from make to make -j?
A: Any dependency you never declared. Serial make happened to run things in the order they appeared, which masked missing edges; -j exposes them as nondeterministic failures. The other three classes are shared scratch files (two recipes writing the same temp path), non-atomic output (a reader sees a partially written file), and recipes that assume a directory already exists. Fix by declaring the real dependencies, using $$ to make temp names unique per process, writing to a temp file and renaming, and using .DELETE_ON_ERROR so half-written targets do not survive.

Q: Why is .DELETE_ON_ERROR recommended in every serious makefile?
A: Because by default a failed recipe leaves whatever it had already written on disk. If the compiler was killed halfway through writing an object file, that truncated file now has a newer timestamp than its source, so the next make considers it up to date and the build proceeds with a corrupt artifact. .DELETE_ON_ERROR removes the target when the recipe exits nonzero.

Q: Why does make still matter when the team uses CMake or Bazel?
A: Because CMake is a generator, not a build tool. Its default Unix generator emits Makefiles that make then executes, so every incremental-build question, every parallelism bug, and every "why did that rebuild" investigation lands in generated make code that you have to read. The same is true of autotools, the Linux kernel build, buildroot, and thousands of vendor SDKs.`,
      },
    ],
    introduction: `make is fifty years old and still the substrate under most C and C++ builds. GNU Make (gmake on the BSDs and Solaris, where make is a different, weaker program) is the dialect everyone actually means: version 4.4.1 is the current documented edition, and the pattern rules, functions, and jobserver that real build systems depend on are GNU extensions, not POSIX make.

The model is one sentence: a target is out of date if it does not exist or if any prerequisite has a newer modification time, and an out-of-date target is rebuilt by running its recipe. Everything else — pattern rules, automatic variables, order-only prerequisites, the function library — exists to describe that graph without writing it out by hand.

The timestamp rule is simultaneously why make is fast and why it is fragile. It is fast because a stat call is cheap and the graph walk is trivially parallelizable. It is fragile because timestamps carry no information about why a file changed. Editing a compiler flag does not change any source mtime, so the build does not rebuild and you get a binary with mixed flags. Restoring a file from backup can give it an old mtime and silently skip its consumers. This is precisely the weakness that content-addressed systems such as Bazel and Buck were built to fix, and knowing the tradeoff is more interesting to an interviewer than knowing the syntax.

Three things separate makefiles that survive from makefiles that rot. Automatic header dependencies via -MMD -MP and -include of the generated .d files, because hand-maintained header lists are always wrong. Correct use of .PHONY and .DELETE_ON_ERROR, because the defaults are wrong for actions and wrong for failed recipes. And a graph complete enough to survive -j, because parallel make is the only real test of whether your dependencies are declared.

Peter Miller's 1997 paper "Recursive Make Considered Harmful" is the other thing to have an opinion about. Splitting a build into per-directory makefiles invoked recursively gives each sub-make an incomplete view of the graph, which produces both unnecessary rebuilds and, worse, missed rebuilds across directory boundaries, and it defeats parallel scheduling because sub-makes serialize at directory granularity. The non-recursive alternative uses include to assemble one graph from many fragment files.

Interviewers probe make for a specific reason: it is the layer where a candidate either understands incremental builds or has only ever typed make -j8. The questions that separate people are the rebuild decision, what -j exposes, why recursive expansion is dangerous, and how you would debug a build that rebuilds everything every time.`,
    whenToUse: [
      'Any C or C++ project small enough that a generator would be overhead, or any project that must build with nothing but a compiler and a shell',
      'Debugging a CMake, autotools, kernel, or buildroot build — the generated layer you actually have to read is make',
      'Wrapping heterogeneous tooling (codegen, protobuf, docs, containers) where the unit of work is a file and the dependency is a timestamp',
      'Investigating why an incremental build rebuilds too much or too little, which is always a question about the declared graph',
      'Interviews and JDs that name gmake explicitly, which usually signals a long-lived C or C++ codebase with a hand-maintained build',
    ],
    keyConcepts: [
      {
        term: 'Rule',
        definition: 'A target, its prerequisites, and a recipe. Recipe lines must begin with a real tab character, which is why a makefile pasted through an editor that expands tabs fails with the message "missing separator". Explicit rules name files literally; pattern rules use % as a stem and match a family of files.',
      },
      {
        term: 'Automatic variables',
        definition: 'Per-recipe variables set by make: $@ is the target, $< the first prerequisite, $^ all prerequisites with duplicates removed and order-only excluded, $+ all prerequisites with duplicates preserved, $? those newer than the target, $* the pattern stem, $| the order-only prerequisites. Each has D and F variants such as $(@D) for the target directory.',
      },
      {
        term: 'Order-only prerequisite',
        definition: 'Listed after a pipe character. Must exist before the target is built, but its timestamp never triggers a rebuild. The canonical case is an output directory, whose mtime changes on every write and would otherwise force a full rebuild on every run.',
      },
      {
        term: 'Variable flavor',
        definition: 'Recursively expanded (=) re-evaluates the right-hand side at every reference. Simply expanded (:=) evaluates once at assignment. ?= assigns only if undefined, += appends and inherits the original flavor, != captures shell output. Default to := and reach for = only when deferred evaluation is genuinely wanted.',
      },
      {
        term: '.PHONY',
        definition: 'Declares that a target is an action, not a file. Without it, the presence of a file named clean or test or install makes that target permanently up to date and the recipe never runs. Also skips the implicit-rule search, which measurably speeds up large makefiles.',
      },
      {
        term: '.DELETE_ON_ERROR',
        definition: 'Deletes the target when its recipe exits nonzero. Not the default. Without it a killed or failed compiler leaves a partially written output file whose mtime is newer than its source, so the next invocation treats corrupt output as up to date. Every serious makefile declares this.',
      },
      {
        term: 'Generated dependencies (-MMD -MP)',
        definition: 'The compiler emits a .d file listing the header prerequisites it actually opened. -MMD excludes system headers, -MD includes them, and -MP adds a phony target per header so deleting a header does not break the build with "No rule to make target". The .d files are pulled in with -include so a first build tolerates their absence.',
      },
      {
        term: 'Jobserver',
        definition: 'The mechanism by which a top-level make -j N shares its job budget with recursive sub-makes, historically a pipe of tokens and since 4.4 also a named FIFO. It is why -j16 on a recursive build does not become 16 sub-makes each running 16 jobs, and why a sub-make invoked without the $(MAKE) variable prints the warning about disabling the jobserver.',
      },
    ],
    approach: [
      'Start by writing the graph, not the commands: list the artifacts, then what each one is derived from, then let the recipes fall out',
      'Turn off the built-in catalogue with MAKEFLAGS += -rR and an empty .SUFFIXES so no implicit rule can fire behind your back',
      'Declare .PHONY for every action target and .DELETE_ON_ERROR once at the top of the file',
      'Generate header dependencies with -MMD -MP into a build directory and -include the resulting .d files; never hand-maintain header prerequisites',
      'Use an order-only prerequisite for the output directory, and create it with a rule rather than mkdir -p inside every recipe',
      'Prefer := for every variable unless deferred expansion is deliberately needed, and use $(shell ...) exactly once per value',
      'Validate the graph by running make -j$(nproc) from a clean tree repeatedly, and by running make twice in a row and confirming the second run says nothing to be done',
    ],
    pitfalls: [
      'Spaces instead of a tab at the start of a recipe line, which produces the message "missing separator" and nothing else useful',
      'Forgetting .PHONY, so a file or directory named test, clean, or docs makes the corresponding target permanently up to date',
      'Hand-writing header prerequisites, which are correct on the day they are written and silently wrong forever after — the build then misses rebuilds after a header change',
      'Using = for a variable whose right-hand side calls $(shell ...), so the command re-runs on every reference and a large build forks hundreds of processes for no reason',
      'Adding a build directory as a normal prerequisite instead of an order-only one, which makes every run a full rebuild because writing into a directory updates its mtime',
      'Assuming each recipe line shares a shell — every line runs in its own shell unless .ONESHELL is set, so cd in one line does not affect the next and a shell variable does not survive',
      'Treating a green make -j8 as proof the graph is correct; parallel failures are nondeterministic, so a missing edge can pass a hundred times and fail in CI on the machine with more cores',
    ],
    keyQuestions: [
      {
        question: 'Explain exactly how make decides to rebuild, and where that model breaks down.',
        answer: `The rule is narrow: make rebuilds a target if the target file does not exist, or if any of its prerequisites has a modification time newer than the target's. It walks the graph depth first, evaluating prerequisites before targets, and runs the recipe of every node judged out of date.

That is the entire decision. It is not a content hash, not a build fingerprint, not a comparison of the command line that produced the file.

Where it breaks:

Flags are invisible. Changing CFLAGS from -O0 to -O2 changes no source file mtime, so make rebuilds nothing and you link a binary made of objects compiled with two different flag sets. The standard mitigation is to make the flags themselves a dependency — write the flag string to a file, only rewrite that file when the content differs, and list it as a prerequisite:

\`\`\`make
.PHONY: force
build/flags: force
	@mkdir -p $(@D)
	@echo '$(CXXFLAGS)' | cmp -s - $@ || echo '$(CXXFLAGS)' > $@

build/%.o: src/%.cpp build/flags
	$(CXX) $(CXXFLAGS) -c $< -o $@
\`\`\`

Timestamps can move backwards. git checkout of an older branch, a restore from backup, rsync without --checksum, or an unpacked archive that preserves mtimes can all give a source file an older timestamp than the object built from it. make then decides the object is current and skips the rebuild. There is no recovery except make clean, which is why the failure is so demoralizing to debug.

Clock skew. On a network filesystem or in a container whose clock differs from the build host, make prints "Warning: File has modification time in the future" and its ordering decisions become arbitrary.

Granularity. Historically make compared timestamps at one-second resolution; modern GNU Make uses high-resolution timestamps where the filesystem provides them, but not every filesystem does. On a coarse filesystem, a source edited within the same tick as its output is not seen as newer.

Phony versus file collision. A target that is an action rather than a file is always up to date the moment a file of that name appears. .PHONY is the fix and there is no other.

Partial output. A recipe that fails after writing part of its output leaves a file with a fresh mtime. make considers it done. .DELETE_ON_ERROR removes it instead.

What the good answer adds: this is precisely the tradeoff that content-addressed build systems attack. Bazel, Buck, and Nix key actions on the hash of inputs plus the hash of the command line, which fixes the flag-change and timestamp-regression problems and additionally enables a shared remote cache. The price is that every input must be declared exactly and hermetically, which is a much larger authoring burden than make's "declare roughly and let timestamps sort it out". ccache occupies a middle ground: it leaves make's scheduling alone but content-hashes the preprocessed source plus flags so a redundant compile becomes a cache hit.`,
      },
      {
        question: 'Write a pattern rule for compiling C++ with automatic header dependencies, and explain every piece.',
        answer: `A complete, production-shaped fragment:

\`\`\`make
MAKEFLAGS += -rR --warn-undefined-variables
.DELETE_ON_ERROR:
.SUFFIXES:

CXX      := g++
CXXFLAGS := -std=c++20 -O2 -Wall -Wextra -MMD -MP
BUILD    := build
SRCS     := $(shell find src -name '*.cpp')
OBJS     := $(patsubst src/%.cpp,$(BUILD)/%.o,$(SRCS))
DEPS     := $(OBJS:.o=.d)

.PHONY: all clean
all: $(BUILD)/app

$(BUILD)/app: $(OBJS)
	$(CXX) $(LDFLAGS) $^ -o $@ $(LDLIBS)

$(BUILD)/%.o: src/%.cpp | $(BUILD)
	@mkdir -p $(@D)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(BUILD):
	@mkdir -p $@

clean:
	$(RM) -r $(BUILD)

-include $(DEPS)
\`\`\`

Piece by piece.

MAKEFLAGS += -rR disables built-in rules and built-in variables. Without it, make carries a large catalogue of suffix rules and can fire one you did not intend; it also wastes time searching them for every target. --warn-undefined-variables turns typos in variable names into visible warnings instead of silent empty strings.

.DELETE_ON_ERROR removes a target whose recipe fails, so an interrupted compile cannot leave a truncated .o that looks up to date.

.SUFFIXES with no prerequisites clears the old suffix-rule list, completing the built-in shutdown.

:= is simple expansion. SRCS uses $(shell find ...) and with = that find would re-run on every reference to SRCS — dozens of times in a real makefile.

$(patsubst src/%.cpp,$(BUILD)/%.o,$(SRCS)) maps source paths to object paths. $(OBJS:.o=.d) is the substitution-reference shorthand for the same idea applied to the dependency files.

The link rule uses $^ — all prerequisites, deduplicated. For a link line where a library must appear more than once to satisfy circular references, $+ is the one that preserves duplicates in order.

The compile rule uses $< (the single source) and $@ (the object). $(@D) is the directory part of the target, so mkdir -p $(@D) creates nested output directories that mirror the source tree.

The pipe before $(BUILD) makes it an order-only prerequisite. Writing an object into a directory updates that directory's mtime; as a normal prerequisite it would be newer than every object and force a full rebuild on every invocation.

-MMD -MP is the dependency machinery. -MMD tells the compiler to write, next to each .o, a .d file containing a make rule listing the headers that object actually depends on — user headers only, since -MMD excludes system headers (use -MD if you want them). -MP additionally emits a phony target for each header. Without -MP, deleting or renaming a header leaves stale .d files referencing a file that no longer exists, and make aborts with "No rule to make target 'old.h', needed by 'foo.o'". With -MP, the phony target absorbs it and the build simply recompiles.

-include $(DEPS) at the bottom pulls those generated rules in. The leading dash matters: on a clean tree no .d files exist yet, and plain include would be a fatal error while -include silently continues. Because the .d files are produced as a side effect of compiling, the first build has no header dependencies and every subsequent build has correct ones — which is exactly right, since the first build compiles everything anyway.

The one thing this fragment does not solve is flag changes, which need the flags-as-a-file trick, and file additions or deletions, since $(shell find) is evaluated once when the makefile is parsed and a newly added source will not appear until make is re-run.`,
      },
      {
        question: 'What breaks when you switch from make to make -j, and how do you find it?',
        answer: `Parallel make does not introduce bugs; it reveals ones that were already there. Serial make executed targets in whatever order the graph walk produced, which frequently happened to satisfy a dependency you never wrote down. Once recipes run concurrently, that accidental ordering disappears.

The four failure classes:

1. Missing prerequisites. The dominant cause. A rule consumes a generated header, a protobuf stub, a version file, or a library it never declared. Serially the generator ran first by luck of ordering; in parallel the consumer starts before it exists. The symptom is a nondeterministic "No such file or directory" or "file not found" that changes target each run and vanishes under -j1. The fix is to declare the edge, never to add a sleep or a .NOTPARALLEL.

2. Shared scratch files. Two recipes that both write /tmp/tmp.o, or a code generator with a fixed intermediate path, or two rules invoking a tool that writes into the current directory. In parallel they clobber each other. Fixes: derive temp names from the target ($@.tmp), or use $$$$ in the recipe to get the shell PID (recall that $$ in a makefile becomes a literal $ for the shell), or use mktemp.

3. Non-atomic outputs. A recipe writes its target incrementally while another recipe, whose dependency is already nominally satisfied because the file exists, starts reading it. The fix is write-then-rename: produce $@.tmp and mv it into place, so the target appears atomically and only when complete.

4. Directory creation races. Several recipes each run mkdir -p on the same output directory. mkdir -p is usually safe, but tools that create then immediately chdir or write can race. Use an order-only prerequisite on the directory instead.

Recursive make adds a fifth: a sub-make invoked as "make -C sub" rather than "$(MAKE) -C sub" does not inherit the jobserver, so it either serializes or, worse, spawns its own full job budget and oversubscribes the machine. GNU Make warns about this.

How to find them:

Run make -j from a clean tree repeatedly. Races are probabilistic; ten clean builds at -j$(nproc) will surface most of them, and a machine with more cores surfaces more.

Use --output-sync=target so each target's output is buffered and printed as a unit. Without it, interleaved compiler output from concurrent jobs is unreadable and you cannot tell which recipe emitted which error.

Use --trace, which prints each recipe along with the makefile and line number that produced it and the reason it is being run. That reason line is what tells you a target was rebuilt because a prerequisite you did not expect changed.

Compare a serial and a parallel run of make -n. If the set of commands differs, the graph is order-dependent.

For a systematic check, some teams add a randomizing shim or run with -j1 and -j64 and diff the produced artifacts.

Escape hatches and when they are legitimate. .NOTPARALLEL forces the whole makefile serial and is almost always the wrong answer — it hides the bug and gives up the speed. A per-target serialization via an artificial order-only prerequisite is acceptable when the underlying tool genuinely cannot run concurrently, for example a tool that takes a global lock on a shared database. Say so explicitly rather than disabling parallelism globally.`,
      },
      {
        question: 'Explain variable flavors in make and give a case where recursive expansion causes a real problem.',
        answer: `GNU Make has two fundamental flavors and several assignment operators that select between them.

Recursively expanded, assigned with =. The right-hand side is stored verbatim and expanded fresh every time the variable is referenced. Nothing on the right-hand side is evaluated at assignment time.

Simply expanded, assigned with := (or ::=, which is the POSIX spelling of the same thing). The right-hand side is expanded once, at the moment of assignment, and the result is stored.

The other operators:

  ?=   assign only if the variable is not already defined, in any flavor. Commonly used so an environment variable or a command-line override wins.
  +=   append. If the variable was simply expanded, the appended text is expanded now; if it was recursively expanded, the appended text is stored unexpanded. This is the operator whose behavior most often surprises people, because it inherits the flavor of the original.
  !=   assign the output of a shell command immediately, with trailing newlines converted to spaces. Equivalent to := $(shell ...).
  :::= immediately expanded but with the result re-escaped so that later expansions treat it as literal text. Rarely needed.

Three real problems caused by recursive expansion:

Self reference is fatal. CFLAGS = $(CFLAGS) -O2 is infinite recursion. make detects it and aborts with "Recursive variable references itself". The simply expanded form CFLAGS := $(CFLAGS) -O2 works fine because the right-hand side is resolved once.

Repeated shell invocation is the expensive one. Consider:

\`\`\`make
VERSION = $(shell git describe --tags --always --dirty)
CPPFLAGS = -DVERSION=\\"$(VERSION)\\"
\`\`\`

VERSION is recursive, so every expansion of CPPFLAGS forks git. CPPFLAGS is itself expanded once per compile recipe. In a project with 800 source files that is 800 git subprocesses, each touching the object database, adding tens of seconds to a build that should be dominated by the compiler. It also means a commit made during the build changes the version string mid-build. Both problems vanish with := on VERSION.

Late binding hides errors. With =, an undefined or misspelled variable inside the right-hand side is not noticed at assignment; it silently expands to empty at the point of use, potentially inside a compiler command line where it produces an obscure failure far from the typo. --warn-undefined-variables surfaces these.

The legitimate use of recursive expansion is deferred evaluation that genuinely must be late. The most important case is target-specific and pattern-specific variables combined with automatic variables:

\`\`\`make
$(BUILD)/%.o: CPPFLAGS = -I$(dir $<)/include
\`\`\`

Here $< is only meaningful when the recipe for a particular target is being prepared, so the value has to be recursively expanded. Another is a variable used as a template that will be expanded through $(call) with different arguments.

The rule of thumb worth stating in an interview: default to :=, use = only when you can name the reason the value must be computed late, and be aware that += silently inherits whichever flavor the variable already had.`,
      },
      {
        question: 'What is the argument in "Recursive Make Considered Harmful", and what does the non-recursive alternative look like?',
        answer: `Peter Miller's 1997 AUUG paper attacks the conventional layout in which a top-level makefile does something like:

\`\`\`make
SUBDIRS := lib app tests
all:
	for d in $(SUBDIRS); do $(MAKE) -C $$d || exit 1; done
\`\`\`

The argument has three parts.

Each sub-make sees an incomplete graph. It knows about the files in its own directory and nothing about the rest of the project. It therefore cannot make a correct up-to-date decision for anything that crosses a directory boundary. Miller's point is that make is a graph algorithm, and running it repeatedly on disjoint subgraphs does not compute the same answer as running it once on the whole graph.

The consequences run in both directions. Missed rebuilds: app depends on a header in lib, lib's makefile does not know app exists, and app's makefile does not know that header exists, so a change to it produces a stale binary. Teams then compensate by rebuilding subdirectories unconditionally, which produces the opposite problem — unnecessary rebuilds, and eventually a culture of make clean before every build, which destroys the entire value of an incremental build system.

Parallelism is crippled. Even with the jobserver correctly propagated through $(MAKE), the top-level for loop serializes at directory granularity: nothing in app can start until everything in lib finishes, even if only one object in lib is out of date and app has forty independent compiles waiting. The critical path becomes the sum of directory depths rather than the true depth of the dependency graph.

There is also a cost nobody notices until the project is large: each recursive invocation re-parses the makefile fragments it includes and re-runs every $(shell) at the top of them, so a hundred-directory tree pays that startup cost a hundred times.

The non-recursive alternative keeps per-directory fragments for authoring convenience but assembles one graph:

\`\`\`make
# top-level Makefile
.PHONY: all
all:

include lib/module.mk
include app/module.mk
include tests/module.mk
\`\`\`

\`\`\`make
# lib/module.mk
LIB_SRCS := $(wildcard lib/*.cpp)
LIB_OBJS := $(patsubst lib/%.cpp,$(BUILD)/lib/%.o,$(LIB_SRCS))
$(BUILD)/lib/libcore.a: $(LIB_OBJS)
	$(AR) rcs $@ $^
all: $(BUILD)/lib/libcore.a
\`\`\`

Every path in every fragment is written relative to the top-level directory, which is the discipline that makes it work: there is exactly one make process, one working directory, and one namespace. Variables are prefixed per module (LIB_SRCS, APP_SRCS) to avoid collisions, or generated with $(eval $(call ...)) from a template when the modules are uniform.

What you get: one complete graph, so cross-directory dependencies are correct in both directions; full parallelism across the entire project, because make can schedule any two independent nodes concurrently regardless of which directory they live in; and a single parse.

What you pay: paths are relative to the root rather than to the fragment, which developers find unnatural at first; variable namespacing becomes manual discipline; and the whole makefile is parsed even when you only want to build one subdirectory, which on a very large tree is a real cost.

The honest closing note for an interview: this argument is one of the reasons the industry moved to generators and to graph-aware systems. CMake with the Ninja generator emits a single flat build.ninja for the whole project, which is the non-recursive design implemented for you; Bazel goes further and makes the whole-graph view mandatory. Recursive make persists mainly in the Linux kernel, which uses it deliberately with a carefully engineered variant, and in legacy trees where nobody has had the budget to flatten it.`,
      },
      {
        question: 'A build rebuilds everything on every invocation even with no source changes. How do you debug it?',
        answer: `This is the most common real make bug and the debugging path is mechanical.

Step 1: find out which target is being rebuilt first. Run with --trace:

\`\`\`bash
make --trace 2>&1 | head -60
\`\`\`

--trace prints, for each recipe, the makefile and line that defined it and the reason make is running it — typically "target 'x' does not exist" or "prerequisite 'y' is newer than target 'x'". That reason line usually names the culprit directly. Also useful is -d filtered, or the narrower --debug=b for basic decisions, since full -d output is unusable at scale.

Step 2: check the obvious causes, in order of frequency.

A missing .PHONY. If all or a similarly named target is not declared phony and no file of that name exists, make must rebuild it every time, which is correct behavior but cascades into rebuilding its prerequisites' recipes if those are also phony-by-accident. Conversely a stray file named "all" makes it permanently up to date, which is the opposite symptom.

A directory used as a normal prerequisite. Writing any file into a directory updates that directory's mtime. If the build directory is a normal prerequisite of every object, then after the first object is written the directory is newer than every other object and everything rebuilds. The fix is the order-only pipe.

A target whose recipe does not actually create the file it names. If the rule is "foo: bar" and the recipe writes foo.out rather than foo, make never sees foo appear and reruns forever. Confirm with ls of the target path after a build.

A generated file that is regenerated unconditionally. A version header, a timestamp file, or a codegen step with a phony prerequisite will have a new mtime every run, and everything downstream of it rebuilds. The fix is generate-to-temp and only replace the real file if the content differs:

\`\`\`make
$(BUILD)/version.h: FORCE
	@mkdir -p $(@D)
	@./scripts/gen-version > $@.tmp
	@cmp -s $@.tmp $@ || mv $@.tmp $@
	@$(RM) -f $@.tmp
.PHONY: FORCE
FORCE:
\`\`\`

A clock or filesystem problem. If make prints "Warning: File has modification time in the future", the source tree and the build host disagree about time — common with a bind-mounted volume in a container, or a network filesystem. Its decisions become unreliable in both directions.

An implicit rule firing. With built-in rules enabled, make may be matching a suffix rule you did not write. Add -rR and see whether the behavior changes.

Step 3: inspect the database. make -p prints every variable, every rule, and every target's prerequisite list as make understands it, including which values came from built-ins, the environment, the command line, or the makefile. Search it for the target in question and confirm its prerequisite list is what you expect — this catches cases where a wildcard or patsubst produced a different set than you assumed.

Step 4: confirm the recipes without running them. make -n prints what would run. Running it twice and diffing tells you whether the set is stable.

Step 5: check timestamps directly. ls --full-time on the target and each prerequisite, or stat, will show you whether the prerequisite really is newer, which distinguishes a make logic problem from a filesystem or checkout problem.

The systemic fix once the immediate cause is found: add a CI step that runs make, then runs make again, and fails if the second run does anything other than report there is nothing to be done. That converts a class of bug that normally goes unnoticed for months into an immediate build failure.`,
      },
    ],
    references: [
      'https://www.gnu.org/software/make/manual/make.html',
      'https://www.gnu.org/software/make/manual/html_node/Automatic-Variables.html',
      'https://www.gnu.org/software/make/manual/html_node/Special-Targets.html',
      'https://aegis.sourceforge.net/auug97.pdf',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 9. CMake for Cross-Platform C++
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-cmake',
    title: 'CMake for Cross-Platform C++',
    icon: 'codepen',
    color: '#ea580c',
    questions: 6,
    description: 'Modern target-based CMake: usage requirements that propagate correctly, install and export so downstream projects get real imported targets, presets, generators, and the directory-scoped anti-patterns that still dominate legacy CMakeLists files.',
    visualizations: [
      {
        title: 'Targets, usage requirements, and how they propagate to consumers',
        image: '/diagrams/devops/nb-9-cmake.png',
        description: `CMake is a build-system generator, not a build system. It reads CMakeLists.txt, produces native build files for a chosen generator, and gets out of the way. Understanding modern CMake means understanding one idea: a target carries both what it needs to build itself and what its consumers need, and the second set propagates automatically.

The unit is the target:

add_executable(app main.cpp) and add_library(core STATIC a.cpp b.cpp) create binary targets. add_library(headeronly INTERFACE) creates a target that compiles nothing but still carries requirements — the correct model for a header-only library. add_library(ns::core ALIAS core) creates a namespaced alias so that in-tree consumption and installed consumption use the identical name, which means the CMakeLists of a consumer does not change when the dependency moves from a subdirectory to a find_package.

Usage requirements and the three keywords:

Every target_* command takes PRIVATE, PUBLIC, or INTERFACE.

  PRIVATE   applies to this target only
  INTERFACE applies to consumers only
  PUBLIC    applies to both

Internally CMake stores build specifications in properties such as COMPILE_DEFINITIONS and INCLUDE_DIRECTORIES, and usage requirements in the matching INTERFACE_ properties. When you link, CMake reads the INTERFACE_ properties of the entire transitive dependency closure and appends them to your target's non-INTERFACE properties. That is the whole propagation mechanism.

The practical test is a header test. If your public header includes a dependency's header, that dependency is PUBLIC — consumers cannot compile without it. If the dependency appears only in .cpp files, it is PRIVATE, and marking it PUBLIC leaks its include paths, its defines, and its link line into every consumer, which is how a project ends up with hundreds of unnecessary include directories on every compile command.

Include directories and the two-world problem:

A library's headers live in one place in the source tree and another place after installation. target_include_directories(core PUBLIC include) bakes an absolute source path into the exported target, so the installed package points at a directory that may not exist on the consumer's machine. The correct form uses generator expressions:

  target_include_directories(core PUBLIC
    $<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>
    $<INSTALL_INTERFACE:include>)

BUILD_INTERFACE content applies only when consumed from the build tree; INSTALL_INTERFACE applies only after installation. Since CMake 3.23 the FILE_SET HEADERS mechanism expresses the same thing declaratively and installs the headers as part of install(TARGETS).

Generator expressions:

Written $<...> and evaluated at generate time, not while CMakeLists.txt is being processed. That is why message() cannot print them. The ones that earn their keep are $<CONFIG:Debug>, $<COMPILE_LANGUAGE:CXX>, $<COMPILE_LANG_AND_ID:CXX,MSVC>, $<TARGET_FILE:tgt>, $<IF:cond,a,b>, and the BUILD_INTERFACE / INSTALL_INTERFACE pair. They exist because multi-config generators do not know the configuration at configure time.

Generators and multi-config:

Ninja is the default choice for command-line builds: fast, one flat graph for the whole project, and it emits compile_commands.json when CMAKE_EXPORT_COMPILE_COMMANDS is on. Unix Makefiles is the fallback that also supports compile_commands.json. Visual Studio and Xcode are multi-config generators, as is Ninja Multi-Config: they produce one build tree that contains all configurations, and CMAKE_BUILD_TYPE is empty and meaningless there. Any logic written as if(CMAKE_BUILD_TYPE STREQUAL "Debug") is silently wrong under Visual Studio; the portable form is $<CONFIG:Debug>.

Consumption and distribution:

find_package has two modes. MODULE mode looks for a Find<Name>.cmake script in CMAKE_MODULE_PATH or shipped with CMake, and is heuristic. CONFIG mode looks for <Name>Config.cmake or <lowercase>-config.cmake installed by the package itself, and is authoritative — the package tells you its own targets, versions, and dependencies. Config mode is what you want, and it is what you should provide for your own library: install(TARGETS ... EXPORT), install(EXPORT ... NAMESPACE ...), a small Config.cmake that calls find_dependency for your PUBLIC dependencies and includes the generated targets file, and a version file from write_basic_package_version_file.

Presets:

CMakePresets.json (checked in) and CMakeUserPresets.json (gitignored) replace ad-hoc shell wrappers. A configure preset names the generator, binaryDir, and cacheVariables; build, test, package, and workflow presets chain off it. Visual Studio, VS Code, and CLion all read them, and the same file drives CI, which is the point: one definition of "the debug build" instead of three.`,
      },
      {
        title: 'Quick-fire interview answers — CMake',
        description: `Q: What is the single biggest difference between modern and legacy CMake?
A: Legacy CMake sets state on directories — include_directories, link_directories, add_definitions — which applies to every target defined afterwards in that directory and its subdirectories, and to nothing else. Modern CMake sets state on targets, and the state propagates along the dependency graph. The consequence is that in modern CMake a consumer gets exactly what its dependencies declared and nothing more, and the same declarations work whether the dependency is a subdirectory or an installed package.

Q: How do you decide between PUBLIC, PRIVATE, and INTERFACE?
A: Ask whether the dependency appears in your public headers. If a consumer must see it to compile against you, it is PUBLIC. If it appears only in your .cpp files, it is PRIVATE. INTERFACE is for targets that have no build of their own — header-only libraries — or for requirements that apply to consumers but not to you. Over-marking things PUBLIC is the common error and it silently balloons every consumer's compile line.

Q: Why is target_include_directories(foo PUBLIC include) a bug?
A: Because that relative path resolves to an absolute path in your source tree and gets written into the exported target. A consumer who installs your package gets an include directory pointing at a path on the build machine. The fix is $<BUILD_INTERFACE:...> for the source-tree path and $<INSTALL_INTERFACE:include> for the installed one, or FILE_SET HEADERS on CMake 3.23 and newer.

Q: What is the difference between find_package CONFIG mode and MODULE mode?
A: MODULE mode runs a Find<Name>.cmake script, usually shipped with CMake or written by you, that guesses at library and header locations. CONFIG mode loads <Name>Config.cmake installed by the package itself, which defines imported targets with their real usage requirements and their own dependencies. CONFIG is authoritative and is what you should both prefer as a consumer and provide as a producer.

Q: Why should you not use file(GLOB) to collect source files?
A: Because glob is evaluated at configure time. Adding a new source file does not change any file CMake watches, so the build system is not regenerated and the new file is never compiled — and the failure looks like a linker error about a missing symbol, far from the cause. CONFIGURE_DEPENDS makes CMake re-check on every build, which costs a directory scan each time and still does not help other developers who have not reconfigured. Listing sources explicitly makes additions visible in code review.

Q: What is the point of CMakePresets.json?
A: One checked-in definition of each build configuration — generator, binary directory, cache variables, toolchain — shared by the command line, Visual Studio, VS Code, CLion, and CI. It removes the class of bug where CI builds with different flags than developers because the flags lived in a shell script nobody kept in sync. Schema version 1 arrived in CMake 3.19 and build and test presets in version 2.`,
      },
    ],
    introduction: `CMake is the default answer for cross-platform C++ and has been for a decade, but the version of CMake most codebases actually contain was written before 2014. That older style sets global, directory-scoped state — include_directories, link_directories, add_definitions, CMAKE_CXX_FLAGS — which applies to every target declared after it in the current directory and its children. It works until a project has more than one target with different requirements, at which point every target gets every other target's flags and nobody can tell which are load-bearing.

Modern CMake, sometimes dated to CMake 3.0 and the target_link_libraries rework, replaces global state with per-target usage requirements. A target declares what it needs to build itself and, separately, what its consumers need. Linking to a target pulls in its consumer-facing requirements transitively. The three keywords PRIVATE, PUBLIC, and INTERFACE select which of the two sets a given declaration belongs to, and getting them right is the single highest-leverage skill in CMake.

The mechanism is simple once stated: for every build specification property there is an INTERFACE_ variant that holds the usage requirement, and CMake appends the INTERFACE_ properties of the entire transitive dependency closure onto the consuming target. Nothing magical, but it means a correctly authored library is consumed with one line — target_link_libraries(app PRIVATE ns::core) — and everything else follows.

Distribution is where the model pays off. install(TARGETS ... EXPORT ...) plus install(EXPORT ... NAMESPACE ns::) generates a targets file; a small package config that calls find_dependency and includes that file makes your library findable through find_package in CONFIG mode; and the consumer's CMakeLists is then identical whether your library came from a subdirectory, FetchContent, vcpkg, Conan, or a distribution package. Producing that is the difference between a library people can use and a library people vendor and patch.

Generators are the other axis. Ninja for speed and for compile_commands.json, Unix Makefiles as the universal fallback, Visual Studio and Xcode and Ninja Multi-Config as multi-config generators where CMAKE_BUILD_TYPE does not exist. Code that branches on CMAKE_BUILD_TYPE is silently wrong on half of them; generator expressions such as $<CONFIG:Debug> are the portable form because they are evaluated at generate time, per configuration.

CMakePresets.json, introduced in CMake 3.19 and extended steadily since, is the piece that makes all of this reproducible. It puts the generator, binary directory, cache variables, and toolchain file in a checked-in JSON file that the command line, Visual Studio, VS Code, CLion, and CI all read, replacing the shell wrapper that always drifts from what CI actually runs.

What an interviewer probes: whether you can explain PUBLIC versus PRIVATE with the public-header test, whether you have ever written an installable package config, whether you know why file(GLOB) is dangerous, and whether you can name the anti-patterns in a legacy CMakeLists and say what each one breaks.`,
    whenToUse: [
      'Any C or C++ project that must build on more than one platform, compiler, or IDE — CMake is the de facto interchange format',
      'Publishing a C or C++ library that other teams will consume, where install and export with imported targets is the deliverable',
      'Consuming third-party dependencies through vcpkg, Conan, or a distribution package manager, all of which speak find_package in CONFIG mode',
      'Standardizing developer and CI build configurations with CMakePresets.json so the two cannot drift apart',
      'Enabling clangd, clang-tidy, include-what-you-use, or an IDE index by emitting compile_commands.json from the Ninja or Makefile generator',
    ],
    keyConcepts: [
      {
        term: 'Target',
        definition: 'The unit of the modern build model, created by add_executable, add_library (STATIC, SHARED, MODULE, OBJECT, INTERFACE), or add_custom_target. A target owns its sources, its build specifications, and its usage requirements. An ALIAS target such as ns::core provides a stable namespaced name so in-tree and installed consumption look identical.',
      },
      {
        term: 'Usage requirement',
        definition: 'A property a target imposes on anything that links to it — include directories, compile definitions, compile features, compile options, link libraries, link options. Stored in the INTERFACE_ variant of the corresponding property and applied transitively across the whole dependency closure at generate time.',
      },
      {
        term: 'PUBLIC / PRIVATE / INTERFACE',
        definition: 'Selects where a declaration lands. PRIVATE affects only this target, INTERFACE only its consumers, PUBLIC both. The decision rule is the public-header test: if the dependency appears in your installed headers it is PUBLIC, otherwise PRIVATE. Header-only libraries use INTERFACE for everything because they have no build of their own.',
      },
      {
        term: 'Generator expression',
        definition: 'A $<...> expression evaluated at build-system generation time rather than during CMakeLists processing. Required for anything that varies per configuration or per language, since multi-config generators do not know the configuration at configure time. Cannot be inspected with message(), which is the usual source of confusion.',
      },
      {
        term: 'BUILD_INTERFACE and INSTALL_INTERFACE',
        definition: 'Generator expressions that split a usage requirement between the build tree and the installed package. $<BUILD_INTERFACE:...> content is used only when consuming from the build tree; $<INSTALL_INTERFACE:...> only after install. Without them an exported target carries absolute build-machine paths that do not exist on the consumer.',
      },
      {
        term: 'find_package CONFIG mode',
        definition: 'Loads a package-supplied <PackageName>Config.cmake or <lowercase>-config.cmake, typically from lib/cmake/<name>/ under a prefix in CMAKE_PREFIX_PATH, which defines real imported targets. MODULE mode instead runs a heuristic Find<PackageName>.cmake script. CONFIG is authoritative because the package describes itself; the first viable config file found wins, even if a newer version exists later in the search order.',
      },
      {
        term: 'install(EXPORT) and export()',
        definition: 'install(TARGETS ... EXPORT name) associates installed artifacts with an export set; install(EXPORT name NAMESPACE ns:: DESTINATION lib/cmake/pkg) writes the file downstream projects load to import those targets. export() writes the equivalent file for the build tree without installing, which lets a consumer point at a build directory. Use GNUInstallDirs so destinations follow platform convention.',
      },
      {
        term: 'CMakePresets.json',
        definition: 'A checked-in JSON file (schema version 1 in CMake 3.19; build and test presets in version 2; package and workflow presets in version 6) defining configurePresets, buildPresets, testPresets, packagePresets, and workflowPresets with inherits, generator, binaryDir, cacheVariables, and condition. CMakeUserPresets.json holds personal presets and is gitignored.',
      },
    ],
    approach: [
      'Set cmake_minimum_required to a version you actually intend to support (3.21 or later buys presets, FILE_SET is 3.23) and call project() with LANGUAGES and VERSION',
      'Create one target per logical library, give each an ALIAS with your namespace, and never declare a source file in more than one target',
      'Declare every requirement with target_compile_features, target_compile_definitions, target_include_directories, target_link_libraries — and choose PUBLIC or PRIVATE by the public-header test on each one',
      'Wrap include directories in $<BUILD_INTERFACE:...> and $<INSTALL_INTERFACE:...>, or use target_sources with FILE_SET HEADERS on CMake 3.23 and newer',
      'Make the package installable: install(TARGETS ... EXPORT), install(EXPORT ... NAMESPACE), a Config.cmake that calls find_dependency for each PUBLIC dependency, and write_basic_package_version_file for the version file',
      'Add enable_testing and add_test (or gtest_discover_tests) so ctest --preset works, and wire a testPreset in CMakePresets.json',
      'Check in CMakePresets.json with the configurations CI uses, turn on CMAKE_EXPORT_COMPILE_COMMANDS, and verify the package by building a tiny consumer project that does find_package against the install prefix',
    ],
    pitfalls: [
      'Using include_directories, link_directories, add_definitions, or appending to CMAKE_CXX_FLAGS — all directory-scoped, all invisible to consumers, and all impossible to reason about once the project has more than a handful of targets',
      'Marking every dependency PUBLIC because it makes the build work, which leaks the entire transitive include and link surface into every consumer and makes dependency removal impossible later',
      'target_include_directories with a bare path, which bakes an absolute build-machine path into the exported target and breaks every consumer of the installed package',
      'file(GLOB) for source lists, because it is evaluated at configure time and a newly added file is never compiled until someone reconfigures — the symptom is an unrelated undefined-symbol link error',
      'Branching on CMAKE_BUILD_TYPE, which is empty under Visual Studio, Xcode, and Ninja Multi-Config, so the branch silently takes the wrong path on exactly the platforms you were trying to support',
      'Hardcoding compiler flags such as -std=c++20 or -Wall into CMAKE_CXX_FLAGS instead of target_compile_features and target_compile_options with $<COMPILE_LANG_AND_ID:...> guards, which breaks the moment MSVC is involved',
      'Shipping an installed package with no Config.cmake, forcing every consumer to write their own Find module and guess at your transitive dependencies',
    ],
    keyQuestions: [
      {
        question: 'Explain PUBLIC, PRIVATE, and INTERFACE in target_link_libraries and what goes wrong when you get them wrong.',
        answer: `Each target carries two sets of properties. Build specifications describe how the target itself is compiled and linked — INCLUDE_DIRECTORIES, COMPILE_DEFINITIONS, COMPILE_OPTIONS, LINK_LIBRARIES. Usage requirements describe what consumers inherit, and live in the INTERFACE_ variants of those same properties. The keyword on a target_* command chooses which set the value goes into:

  PRIVATE   -> build specification only
  INTERFACE -> usage requirement only
  PUBLIC    -> both

At generate time CMake walks the transitive closure of a target's dependencies, reads their INTERFACE_ properties, and appends them to the consuming target's non-INTERFACE properties. That is the entire propagation mechanism, and it is why one target_link_libraries line can bring in include paths, defines, compile features, and link flags you never mentioned.

The decision rule is the public-header test. Open your installed headers. If a header a consumer will include in turn includes a dependency's header, or names a dependency's type in a signature or a member, that dependency is PUBLIC — the consumer physically cannot compile without it. If the dependency appears only inside your .cpp files, it is PRIVATE.

\`\`\`cmake
add_library(core src/core.cpp src/detail.cpp)
add_library(myproj::core ALIAS core)

target_link_libraries(core
  PUBLIC  Threads::Threads          # std::thread appears in core/api.h
  PRIVATE fmt::fmt                  # only used inside detail.cpp
)
\`\`\`

What goes wrong when it is too narrow. Marking a genuinely public dependency PRIVATE produces a consumer that fails to compile with "no such file or directory" on a header it never asked for, or fails to link with undefined references to the dependency's symbols. It is annoying but loud, and the fix is obvious.

What goes wrong when it is too broad, which is the far more common and far more damaging error. Marking everything PUBLIC means every consumer inherits every include directory, every compile definition, and every link entry of the entire transitive graph. Four concrete consequences:

Compile lines explode. A mid-sized project can end up with a hundred -I flags on every translation unit, which slows the preprocessor measurably and makes compile_commands.json unreadable.

Symbol and macro collisions. A dependency's compile definition — say a -DDEBUG or a -DSTRICT — now applies to code that never wanted it, and to code that defines the same name.

Header shadowing. Two dependencies both ship a config.h. Whichever include directory lands first wins, and which one that is depends on link order, so the failure is order-dependent and moves when someone reorders a line.

Dependencies become permanent. Once consumers have started including headers they reached only because you over-published, you cannot remove or replace that dependency without breaking them. The over-broad declaration has turned an implementation detail into part of your API.

INTERFACE is the third case, for targets with no build of their own:

\`\`\`cmake
add_library(headeronly INTERFACE)
target_include_directories(headeronly INTERFACE
  $<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>)
target_compile_features(headeronly INTERFACE cxx_std_20)
\`\`\`

An INTERFACE library compiles nothing and produces no artifact, so PRIVATE and PUBLIC would be meaningless on it; every declaration is a usage requirement.

One subtlety worth mentioning to signal depth: a PRIVATE dependency of a static library still ends up on the consumer's link line, because a static archive does not resolve its own symbols. CMake handles this by recording it in INTERFACE_LINK_LIBRARIES as $<LINK_ONLY:dep> — the library is linked but its include directories and definitions are not propagated. So PRIVATE on a static library correctly hides the compile-time surface while preserving link correctness, which is exactly the behavior you want and one that a hand-written Find module never gets right.`,
      },
      {
        question: 'Walk through making a library consumable by downstream projects via find_package with imported targets.',
        answer: `The deliverable is that a consumer writes two lines:

\`\`\`cmake
find_package(myproj 1.4 REQUIRED)
target_link_libraries(app PRIVATE myproj::core)
\`\`\`

and gets the correct include directories, compile features, defines, and transitive dependencies without knowing anything about your layout. Producing that takes four pieces.

1. Declare the target with install-aware usage requirements.

\`\`\`cmake
cmake_minimum_required(VERSION 3.23)
project(myproj VERSION 1.4.0 LANGUAGES CXX)
include(GNUInstallDirs)

add_library(core src/core.cpp)
add_library(myproj::core ALIAS core)

target_compile_features(core PUBLIC cxx_std_20)
target_link_libraries(core PUBLIC Threads::Threads PRIVATE fmt::fmt)

target_sources(core PUBLIC
  FILE_SET HEADERS
  BASE_DIRS include
  FILES include/myproj/core.h)
\`\`\`

FILE_SET HEADERS (CMake 3.23 and later) declares the public headers, sets the include directory usage requirement for both build and install worlds, and makes install(TARGETS) able to install them. On older CMake you write the generator-expression form of target_include_directories with $<BUILD_INTERFACE:...> and $<INSTALL_INTERFACE:include> and a separate install(DIRECTORY).

2. Install the artifacts and record them in an export set.

\`\`\`cmake
install(TARGETS core
  EXPORT myprojTargets
  RUNTIME  DESTINATION \${CMAKE_INSTALL_BINDIR}
  LIBRARY  DESTINATION \${CMAKE_INSTALL_LIBDIR}
  ARCHIVE  DESTINATION \${CMAKE_INSTALL_LIBDIR}
  FILE_SET HEADERS DESTINATION \${CMAKE_INSTALL_INCLUDEDIR})
\`\`\`

EXPORT associates the installed files with a named export set. GNUInstallDirs supplies the platform-correct destinations; hardcoding lib breaks on distributions that use lib64.

3. Generate the targets file and the package config.

\`\`\`cmake
install(EXPORT myprojTargets
  FILE      myprojTargets.cmake
  NAMESPACE myproj::
  DESTINATION \${CMAKE_INSTALL_LIBDIR}/cmake/myproj)

include(CMakePackageConfigHelpers)
configure_package_config_file(
  \${CMAKE_CURRENT_SOURCE_DIR}/cmake/myprojConfig.cmake.in
  \${CMAKE_CURRENT_BINARY_DIR}/myprojConfig.cmake
  INSTALL_DESTINATION \${CMAKE_INSTALL_LIBDIR}/cmake/myproj)

write_basic_package_version_file(
  \${CMAKE_CURRENT_BINARY_DIR}/myprojConfigVersion.cmake
  VERSION       \${PROJECT_VERSION}
  COMPATIBILITY SameMajorVersion)

install(FILES
  \${CMAKE_CURRENT_BINARY_DIR}/myprojConfig.cmake
  \${CMAKE_CURRENT_BINARY_DIR}/myprojConfigVersion.cmake
  DESTINATION \${CMAKE_INSTALL_LIBDIR}/cmake/myproj)
\`\`\`

The NAMESPACE is what makes the imported target myproj::core rather than bare core. It matters for more than aesthetics: a name containing a double colon is always treated as a target, so a typo fails at configure time instead of silently becoming a raw -l flag on the link line.

4. Write the config template. This is the piece most projects skip, and skipping it is why so many packages are painful to consume.

\`\`\`cmake
@PACKAGE_INIT@
include(CMakeFindDependencyMacro)
find_dependency(Threads)
include("\${CMAKE_CURRENT_LIST_DIR}/myprojTargets.cmake")
check_required_components(myproj)
\`\`\`

find_dependency must name every PUBLIC dependency. If core publicly links Threads::Threads and the config does not re-find it, the consumer loads myprojTargets.cmake, which references a target Threads::Threads that does not exist in their project, and CMake fails at generate time with an error about an interface link that is not a target. PRIVATE dependencies do not belong here, which is another reason to get the keywords right.

Two things to add for credibility. Provide the build-tree equivalent with export(EXPORT myprojTargets NAMESPACE myproj:: FILE myprojTargets.cmake) so a superproject can point CMAKE_PREFIX_PATH at your build directory without installing. And verify the result: configure, build, install to a scratch prefix, then configure a five-line consumer project with CMAKE_PREFIX_PATH set to that prefix and confirm it compiles and links. Adding that verification to CI is what stops the package config from rotting, because nothing in a normal build exercises it.`,
      },
      {
        question: 'What are generator expressions, and why is BUILD_INTERFACE versus INSTALL_INTERFACE necessary?',
        answer: `Generator expressions are $<...> expressions evaluated during build-system generation, after all CMakeLists.txt processing is finished. That timing is the whole reason they exist.

Consider a Visual Studio or Xcode or Ninja Multi-Config build tree. It contains Debug, Release, RelWithDebInfo, and MinSizeRel simultaneously; the configuration is chosen at build time, not at configure time. So at the moment CMake is reading your CMakeLists.txt there is no answer to "what is the build type" — CMAKE_BUILD_TYPE is empty. Anything that varies per configuration therefore cannot be an if(); it has to be an expression the generator resolves per configuration:

\`\`\`cmake
target_compile_definitions(core PRIVATE $<$<CONFIG:Debug>:MYPROJ_ASSERTS=1>)
target_compile_options(core PRIVATE
  $<$<COMPILE_LANG_AND_ID:CXX,GNU,Clang>:-Wall -Wextra>
  $<$<COMPILE_LANG_AND_ID:CXX,MSVC>:/W4>)
\`\`\`

The same argument applies per language: a target containing both C and C++ sources needs $<COMPILE_LANGUAGE:CXX> to avoid passing a C++ flag to the C compiler, and there is no configure-time value for "the language of the file being compiled".

Because they are evaluated after processing, you cannot inspect them with message() — it prints the literal string. To debug one, use file(GENERATE OUTPUT ... CONTENT ...) which is itself generate-time, or read the generated compile_commands.json.

The most consequential pair is BUILD_INTERFACE and INSTALL_INTERFACE, and the problem they solve is that a library's headers exist in two different places over its lifetime.

Suppose you write the naive form:

\`\`\`cmake
target_include_directories(core PUBLIC include)
\`\`\`

CMake resolves that relative path against the current source directory, so the target's INTERFACE_INCLUDE_DIRECTORIES becomes something like /home/build/agent/work/myproj/include. In the build tree that is correct. Then install(EXPORT) writes that same value into myprojTargets.cmake, and a consumer on a different machine gets an imported target whose include directory is a path that does not exist. Newer CMake catches the obvious case and errors at install time with a message about the target containing a path in the source directory, which is a good error but only fires on the export path.

The correct form declares both worlds:

\`\`\`cmake
target_include_directories(core PUBLIC
  $<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:\${CMAKE_INSTALL_INCLUDEDIR}>)
\`\`\`

BUILD_INTERFACE content evaluates to its argument when the target is consumed from the build tree and to nothing when consumed from an installed package. INSTALL_INTERFACE does the reverse, and its path is interpreted relative to the installation prefix, so it must be relative — an absolute path there is an error. The result is one declaration that is correct in both contexts, whether the consumer used add_subdirectory, FetchContent, export() against a build tree, or find_package against an install prefix.

The same split applies to anything else that differs between the two worlds — a compile definition that only makes sense in-tree, or a link path.

On CMake 3.23 and later, FILE_SET HEADERS expresses the common case declaratively and removes the chance of getting the expressions wrong:

\`\`\`cmake
target_sources(core PUBLIC FILE_SET HEADERS BASE_DIRS include FILES include/myproj/core.h)
\`\`\`

CMake then sets the build-tree and install-tree include directories itself and install(TARGETS ... FILE_SET HEADERS DESTINATION ...) installs the files with their directory structure preserved. It is strictly better where the minimum version allows it, and knowing that it exists — and that it is 3.23 — is a useful signal that you have written CMake recently rather than from memory of a 2016 tutorial.`,
      },
      {
        question: 'Compare the CMake generators, and explain what breaks when you assume CMAKE_BUILD_TYPE.',
        answer: `A generator is what turns the configured project into native build files. The choice affects build speed, tooling, and — critically — whether configuration is a configure-time or a build-time concept.

Ninja. The default choice for command-line and CI builds. It produces one flat build.ninja for the entire project, so parallel scheduling is across the whole dependency graph rather than per directory; its dependency checking is fast; and null builds are close to instantaneous. It supports CMAKE_EXPORT_COMPILE_COMMANDS, which is what clangd, clang-tidy, and include-what-you-use consume. Single-config: the configuration is fixed at configure time by CMAKE_BUILD_TYPE.

Unix Makefiles. The portable fallback, available anywhere make exists, and the other generator that emits compile_commands.json. Slower than Ninja on large projects — the generated makefiles are recursive per directory, which reintroduces exactly the parallel-scheduling limitation the "Recursive Make Considered Harmful" argument describes. Single-config.

Ninja Multi-Config. Ninja's speed with multi-config semantics, available from CMake 3.17. Useful when you want one build tree that can produce both Debug and Release without reconfiguring.

Visual Studio (for example "Visual Studio 17 2022"). Generates .sln and .vcxproj. Multi-config. Takes -A for the target platform and -T for the toolset. Necessary if developers live in the IDE; slower than Ninja, and MSBuild's incremental behavior is harder to reason about. Note that Visual Studio can also drive Ninja through CMakePresets.json, which is usually the better arrangement.

Xcode. Generates an .xcodeproj. Multi-config. Required for iOS and macOS code signing, app bundles, and framework builds.

The multi-config distinction is where code breaks. In a multi-config generator the build tree contains every configuration at once and the configuration is selected at build time with cmake --build . --config Release. CMAKE_BUILD_TYPE is empty and stays empty. So this common pattern:

\`\`\`cmake
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
  target_compile_definitions(core PRIVATE ENABLE_ASSERTS)
endif()
\`\`\`

does exactly the wrong thing on Visual Studio and Xcode: the condition is false regardless of what the developer is building, so a Debug build silently ships without the define. Nothing errors. Nobody notices until an assertion that should have fired did not.

The portable form is a generator expression, because it is resolved once per configuration at generate time:

\`\`\`cmake
target_compile_definitions(core PRIVATE $<$<CONFIG:Debug>:ENABLE_ASSERTS>)
\`\`\`

The same trap applies to output paths. CMAKE_RUNTIME_OUTPUT_DIRECTORY set to a fixed path puts all four configurations' binaries in one directory where they overwrite each other; the multi-config generators append a per-config subdirectory unless you defeat it, and the per-config variables such as CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG or a $<CONFIG> component in the path are the correct answer. Anything that computes a path to a built artifact should use $<TARGET_FILE:tgt> rather than assembling a path by hand, for the same reason.

Two more generator-sensitive details worth knowing. CMAKE_EXPORT_COMPILE_COMMANDS is implemented only by the Makefile and Ninja generators and is ignored elsewhere, so a Visual Studio generator build produces no compile_commands.json and clangd has nothing to read — a common reason a Windows developer has no IDE completion while their Linux colleagues do. And custom commands that assume a single configuration directory layout will place outputs where the other configurations cannot find them.

The practical recommendation: use Ninja for CI and for command-line development, use Ninja Multi-Config or the IDE generator when the IDE demands it, drive all of them from CMakePresets.json so the cache variables are identical, and write every configuration-dependent decision as a generator expression so the same CMakeLists is correct under both models.`,
      },
      {
        question: 'How do you choose between FetchContent, find_package, and a package manager for dependencies?',
        answer: `The three are not alternatives so much as layers, and the strong answer is that a well-authored project supports more than one.

find_package in CONFIG mode is the consumption mechanism. The dependency is already built and installed somewhere on the machine, it shipped a Config.cmake describing its imported targets and its own dependencies, and CMake locates it by searching prefixes from CMAKE_PREFIX_PATH, <PackageName>_ROOT, and platform conventions such as lib/cmake/<name>/. It is the fastest to configure, it respects whatever the platform or the package manager installed, and it is what every package manager ultimately produces. MODULE mode — a Find<Name>.cmake script — is the fallback for libraries that predate the config-file convention; it guesses, so its results are less reliable and it commonly fails to model transitive dependencies.

FetchContent is the source-acquisition mechanism. FetchContent_Declare records where to get the source and FetchContent_MakeAvailable downloads it at configure time and calls add_subdirectory on it, so its targets become part of your build. The essential contrast with ExternalProject_Add is timing: ExternalProject downloads and builds at build time, so its targets are not visible to your CMake code, while FetchContent populates at configure time so you can link to the targets directly.

Strengths: zero setup for a contributor, exact version pinning in the repository, and one build for your code and the dependency so flags and sanitizers apply uniformly. Weaknesses: it builds the dependency from source on every clean build, which for something like Boost or Abseil dominates CI time; the dependency's CMakeLists runs inside yours, so its options, its CMAKE_CXX_FLAGS mutations, and its target names collide with yours; and there is no shared cache across projects.

The important modern feature is that the two can be combined. FetchContent_Declare with FIND_PACKAGE_ARGS makes FetchContent_MakeAvailable try find_package first and only download if that fails, and OVERRIDE_FIND_PACKAGE routes subsequent find_package calls through FetchContent. That gives you the behavior you actually want: use the system or package-manager copy when it exists, fall back to source when it does not, with one declaration.

A package manager — vcpkg, Conan, or the platform's own — is the resolution and caching layer. vcpkg integrates through a toolchain file (CMAKE_TOOLCHAIN_FILE pointing at scripts/buildsystems/vcpkg.cmake) and a vcpkg.json manifest; Conan generates a toolchain and a set of config files through its CMakeDeps and CMakeToolchain generators. Both then make find_package(Foo CONFIG REQUIRED) work. Their value is binary caching, transitive resolution with version constraints, and a curated set of patches that make libraries actually build on Windows. Their cost is a second tool in the loop and a second place where a dependency version is recorded.

How to decide:

Use plain find_package when the dependency is genuinely a system dependency — Threads, OpenSSL, ZLIB, a vendor SDK — or when your consumers are distribution packagers, who will always supply their own copies and will be actively hostile to a build that downloads from the network.

Use FetchContent for small, header-mostly, source-stable dependencies where building from source is cheap: GoogleTest, fmt, nlohmann_json, Catch2. Pin by tag or commit hash, never by branch.

Use a package manager once you have more than roughly five to ten third-party dependencies, once transitive version conflicts appear, or once CI build time is dominated by rebuilding dependencies that never change. Binary caching is the deciding factor.

The authoring rule that makes all three work: your CMakeLists should always express the dependency as find_package plus target_link_libraries against the namespaced imported target. If you write it that way, the same file works whether the target came from the system, from vcpkg, from Conan, or from FetchContent, because all four produce a target with the same name. Writing target_link_libraries(app PRIVATE gtest_main) against a FetchContent-provided target rather than GTest::gtest_main is the mistake that locks you into one acquisition method.`,
      },
      {
        question: 'Name the modern CMake anti-patterns and explain what each one actually breaks.',
        answer: `Six that show up in almost every legacy CMakeLists, in rough order of damage.

include_directories, link_directories, add_definitions. These set directory-scoped state: they apply to every target created afterwards in the current directory and its subdirectories, and to nothing else. Three failures follow. Targets get flags they do not need and nobody can tell which are load-bearing, so nothing can be removed safely. The state is invisible to consumers, so a target that builds inside your project fails when someone links it from elsewhere — the include directory that made it work was never part of the target. And link_directories specifically produces a bare -L plus -l, which discards the exact library file, defeats the linker's own dependency tracking, and is famously order-sensitive. Replace with target_include_directories, target_link_libraries against real targets, and target_compile_definitions.

Appending to CMAKE_CXX_FLAGS. Global, applies to every target and every configuration, and cannot be overridden per target. It also breaks compiler portability instantly: -std=c++20 is meaningless to MSVC, -Wall means something entirely different there. The replacements are target_compile_features(tgt PUBLIC cxx_std_20), which lets CMake choose the right flag per compiler and propagates the requirement to consumers, and target_compile_options with $<COMPILE_LANG_AND_ID:CXX,GNU,Clang> guards for warning flags. A related sub-case is setting CMAKE_CXX_STANDARD as a plain variable, which does not propagate to consumers at all.

file(GLOB) for source lists. Globs are evaluated at configure time. Add a new .cpp and nothing CMake watches has changed, so the build system is not regenerated and the file is simply not compiled. The symptom is an undefined-symbol link error naming a function you just wrote, with no indication that its file was never built. CONFIGURE_DEPENDS makes the generator re-check on every build, but it costs a directory scan per build and — the part people miss — still does not help a colleague who pulls your commit, because their existing build tree only re-globs if something triggers a regeneration. Explicit source lists also make additions and deletions visible in code review, which is worth something on its own.

Everything PUBLIC. Discussed at length elsewhere, but as an anti-pattern the specific damage is that it converts implementation details into permanent API. Once consumers include headers they only reached because you over-published, removing that dependency is a breaking change.

Branching on CMAKE_BUILD_TYPE. Empty under Visual Studio, Xcode, and Ninja Multi-Config, so the branch silently takes the wrong path on the platforms you added CMake for in the first place. Use $<CONFIG:Debug>.

Hardcoded install destinations. install(TARGETS core DESTINATION lib) breaks on distributions that use lib64 and on Windows where the runtime belongs in bin. include(GNUInstallDirs) and use CMAKE_INSTALL_LIBDIR, CMAKE_INSTALL_BINDIR, CMAKE_INSTALL_INCLUDEDIR.

Three more worth naming quickly. Bare target names in target_link_libraries rather than namespaced imported targets — if the name has no double colon and no such target exists, CMake passes it through as a raw library name and you get a link error far from the cause, whereas a name containing :: is always treated as a target and fails at configure time. Using the plain-signature target_link_libraries(tgt lib) without a keyword, which is the legacy form and cannot be mixed with the keyword form on the same target. And set(CMAKE_BUILD_TYPE Release) inside CMakeLists.txt, which overrides what the user or the preset asked for.

The framing to offer at the end: every one of these anti-patterns is global mutable state, and every replacement is a property attached to a target. That is the entire migration. A useful incremental strategy is to add new targets in the modern style, add ALIAS targets for the old ones, and remove one directory-scoped command at a time, because a big-bang rewrite of a large CMakeLists is unreviewable and will silently drop a flag someone depended on.`,
      },
    ],
    references: [
      'https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html',
      'https://cmake.org/cmake/help/latest/manual/cmake-generator-expressions.7.html',
      'https://cmake.org/cmake/help/latest/command/find_package.html',
      'https://cmake.org/cmake/help/latest/command/install.html',
      'https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html',
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // 10. Cross-Compilation and Sysroots
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-cross-compilation',
    title: 'Cross-Compilation and Sysroots',
    icon: 'globe',
    color: '#ea580c',
    questions: 5,
    description: 'Build, host, and target machines; GNU triples; what a sysroot actually contains; CMake toolchain files and the find_root_path knobs; and testing cross-built binaries under QEMU.',
    visualizations: [
      {
        title: 'Three machines, one build: triples, sysroots, and toolchain files',
        image: '/diagrams/devops/nb-10-cross-compilation.png',
        description: `Cross-compilation has exactly three machines in play, and almost every confused conversation about it comes from collapsing them into two.

Build machine: where the compiler process actually executes. Your x86-64 Linux CI runner.
Host machine: where the thing you are producing will run. An aarch64 embedded board.
Target machine: only meaningful when the thing you are producing is itself a compiler. If you are building GCC on x86-64 that runs on aarch64 and emits code for RISC-V, then build=x86_64, host=aarch64, target=riscv64. That is a Canadian cross, and it is the only case where "target" has a distinct meaning.

For a normal application build there is no target. Autotools spells this out directly: ./configure --build=x86_64-pc-linux-gnu --host=aarch64-unknown-linux-gnu. Setting --target on an application configure line does nothing useful and is one of the classic tells that someone has copy-pasted a cross build without understanding it. CMake uses different words for the same idea: CMAKE_HOST_SYSTEM_NAME describes the build machine, and CMAKE_SYSTEM_NAME describes the host machine in autotools terms. CMake's "system" is autotools' "host". Interviewers ask this deliberately.

GNU target triples:
The canonical form is arch-vendor-os-abi, though it is frequently written with three or even two components because vendor is routinely elided or written as "unknown" or "none".

  x86_64-pc-linux-gnu          64-bit x86, Linux, glibc
  aarch64-unknown-linux-gnu    64-bit ARM, Linux, glibc
  aarch64-unknown-linux-musl   same arch, musl libc, an entirely different ABI surface
  arm-linux-gnueabihf          32-bit ARM, Linux, glibc, hard-float EABI
  arm-none-eabi                bare metal, no OS, newlib or nothing
  x86_64-w64-mingw32           Windows PE target from a Unix build machine
  riscv64-unknown-elf          bare-metal RISC-V

The gnueabi versus gnueabihf distinction is not cosmetic. Hard-float passes floating point arguments in VFP registers; soft-float passes them in core registers. Link a hard-float object against a soft-float library and you do not get a diagnostic, you get silently wrong floating point arguments at runtime. Run gcc -dumpmachine on any toolchain to get the triple it was configured for, and config.guess to get the triple of the machine you are standing on.

What a sysroot actually is:
A sysroot is a directory that mirrors the target filesystem layout for the parts a compiler and linker care about. Concretely it holds usr/include (target headers, including the target's libc headers and its kernel UAPI headers), usr/lib and lib (target libraries, both the .so runtime objects and the .a archives), lib/<triplet> on multiarch systems, and usually usr/lib/pkgconfig with .pc files whose prefix has been rewritten to be sysroot-relative.

Passing --sysroot=/opt/rootfs-aarch64 to GCC or Clang re-roots the default include and library search paths under that directory. Without it, the cross compiler happily reaches into /usr/include on the build machine, pulls in x86-64 headers, and then either fails with a wall of unrelated errors or, worse, compiles cleanly against structures whose layout differs on the target. The linker equivalent is =/lib in -rpath-link paths, where the leading equals sign means "prefix with sysroot".

Where sysroots come from: an actual tarball of the device rootfs (rsync the board, then fix absolute symlinks); a Yocto or Buildroot SDK, which ships a matched compiler plus sysroot plus an environment-setup script that exports CC, CXX, CFLAGS, PKG_CONFIG_SYSROOT_DIR and friends; a distro cross package set (gcc-aarch64-linux-gnu plus Debian multiarch libraries under /usr/lib/aarch64-linux-gnu); or a vendor toolchain from ARM or Linaro.

The CMake toolchain file:
CMake loads the toolchain file very early, before compiler detection, via cmake --toolchain path/to/file or -DCMAKE_TOOLCHAIN_FILE=path/to/file. Setting CMAKE_SYSTEM_NAME in that file is what flips CMAKE_CROSSCOMPILING to true and puts CMake into cross mode. A minimal Linux-to-Linux-ARM file, straight from the CMake manual:

  set(CMAKE_SYSTEM_NAME Linux)
  set(CMAKE_SYSTEM_PROCESSOR arm)
  set(CMAKE_SYSROOT /home/devel/rasp-pi-rootfs)
  set(CMAKE_STAGING_PREFIX /home/devel/stage)
  set(tools /home/devel/gcc-4.7-linaro-rpi-gnueabihf)
  set(CMAKE_C_COMPILER \${tools}/bin/arm-linux-gnueabihf-gcc)
  set(CMAKE_CXX_COMPILER \${tools}/bin/arm-linux-gnueabihf-g++)

CMAKE_STAGING_PREFIX is the one people miss. CMAKE_INSTALL_PREFIX is always the runtime location on the target — /usr, say — because that path gets baked into config files and rpaths. CMAKE_STAGING_PREFIX is where the install tree actually lands on the build machine. Without it you either install into your own /usr or you break every path that was computed from the install prefix.

The find_root_path knobs are the other half. CMAKE_FIND_ROOT_PATH prepends directories to every find_* search. The four mode variables then decide, per category, whether to look in those roots, in the host root, or both: ONLY searches only the re-rooted paths, NEVER ignores them and uses only the host system root, and BOTH searches both. The idiomatic block is PROGRAM set to NEVER (you need host-executable tools such as protoc, flex, and pkg-config) and LIBRARY, INCLUDE, and PACKAGE set to ONLY (you need target artifacts). Get this wrong and find_package(ZLIB) resolves to /usr/lib/x86_64-linux-gnu/libz.so, configure succeeds, and the link fails with "file in wrong format" — or on a bad day succeeds and the binary refuses to start on the board.`,
      },
      {
        title: 'Quick-fire interview answers — cross-compilation',
        description: `Q: What is the difference between build, host, and target?
A: Build is the machine running the compiler. Host is the machine the produced binary will run on. Target only exists when the produced binary is itself a compiler — it is the architecture that compiler will emit code for. For an ordinary application cross build there are only two machines and passing --target to configure accomplishes nothing. CMake calls the host machine CMAKE_SYSTEM_NAME and the build machine CMAKE_HOST_SYSTEM_NAME, which is the reverse of what most people expect on first read.

Q: What does --sysroot do that -I and -L do not?
A: -I and -L add search paths on top of the compiler built-in defaults, so /usr/include and /usr/lib on the build machine remain in the search order and can still win. --sysroot re-roots the built-in defaults themselves, so the target headers and libraries replace the host ones rather than competing with them. It also makes the linker resolve absolute paths recorded inside linker scripts and .so symlinks relative to the sysroot, which -L cannot do.

Q: Why does find_package find the wrong library when cross-compiling?
A: Because CMAKE_FIND_ROOT_PATH_MODE_LIBRARY, _INCLUDE and _PACKAGE default to BOTH, so CMake searches the host system paths as well as the sysroot. On a Debian build machine the host copy of a common library is almost always present and often gets found first. The fix is to set those three to ONLY in the toolchain file and leave CMAKE_FIND_ROOT_PATH_MODE_PROGRAM at NEVER so host build tools still resolve.

Q: What happens to try_run when you cross-compile?
A: CMake compiles the test program but cannot execute it, so it creates cache entries the developer is expected to fill in by hand: the run result variable for the exit code and <var>__TRYRUN_OUTPUT for the captured stdout and stderr. Configure will stop and ask. The clean fixes are to set CMAKE_CROSSCOMPILING_EMULATOR to something like qemu-aarch64 so CMake can actually run the probe, or to guard the try_run behind if(NOT CMAKE_CROSSCOMPILING) and supply a known answer for the cross path.

Q: How do you run tests for a cross-built binary in CI?
A: Two options. Register qemu-user through binfmt_misc on the runner so target binaries execute transparently, which is what the multiarch qemu-user-static container does; then ctest works unchanged. Or set CMAKE_CROSSCOMPILING_EMULATOR to the qemu binary, which CMake also uses as the default CROSSCOMPILING_EMULATOR target property so add_test commands get prefixed automatically. QEMU user mode covers CPU semantics and syscalls; it does not cover device drivers, real timing, or SIMD-adjacent performance, so a hardware smoke test on real boards still belongs in the pipeline.

Q: What is multiarch and how is it different from multilib?
A: Multilib is one package shipping several ABIs of the same library under lib and lib64 on one architecture — the classic 32-bit-on-64-bit x86 case. Multiarch is Debian's scheme for co-installing genuinely different architectures: libraries move to /usr/lib/<gnu-triplet>, you enable a foreign architecture with dpkg --add-architecture arm64, and you install target packages with a suffix such as libssl-dev:arm64. Multiarch gives you a real target sysroot assembled by the package manager instead of one you tarball off a device.`,
      },
    ],
    introduction: `Cross-compilation is the routine case, not the exotic one. Embedded Linux, mobile, WebAssembly, Apple Silicon universal binaries, and any CI matrix that ships more than one architecture all involve producing binaries on a machine that cannot run them. The reason it feels hard is that build systems were designed around the assumption that the compiler, the libraries it links against, and the machine executing the resulting program are all the same box, and every layer that assumption leaks through has to be corrected by hand.

The vocabulary is the first hurdle and the one interviewers use as a filter. Build, host, and target are three distinct machines with precise autotools meanings, and target only exists when the artifact being built is itself a compiler. CMake reuses the word "system" for what autotools calls host, which means CMAKE_SYSTEM_NAME describes the machine you are building for and CMAKE_HOST_SYSTEM_NAME describes the machine you are building on. Candidates who explain this cleanly have done it; candidates who say "host is where I am compiling" have read about it.

The second hurdle is the sysroot. A cross compiler binary on its own is useless — it knows how to emit aarch64 instructions but it has no idea what struct stat looks like on your target glibc, or where libssl.so.3 lives, or what the target kernel headers say. The sysroot supplies all of that. Getting a sysroot that exactly matches the deployment image is the single largest source of production-only failures in cross builds: symbol version mismatches against glibc, a libstdc++ newer than the one on the device, a header that describes a different structure layout than the running kernel.

The third hurdle is that build systems will silently reach for host artifacts when target artifacts are missing. CMake's find_package searching host paths by default is the canonical example; pkg-config reading /usr/lib/pkgconfig without PKG_CONFIG_SYSROOT_DIR set is the second. Both fail at link time if you are lucky and at runtime on the device if you are not. The CMAKE_FIND_ROOT_PATH_MODE_* variables exist precisely to close this hole, and knowing why PROGRAM is set to NEVER while LIBRARY and INCLUDE are set to ONLY demonstrates you understand that a cross build needs host tools and target libraries at the same time.

The fourth is feature detection. Any configure-time check that compiles and runs a probe program is broken under cross-compilation by construction. Autotools has AC_RUN_IFELSE with a mandatory cross fallback value for this reason; CMake has try_run, which under cross-compilation stops and demands that you hand-populate a cache variable with the answer the target would have given. Both have an escape hatch — an emulator — and CMAKE_CROSSCOMPILING_EMULATOR set to a qemu-user binary is the modern answer.

Where an interviewer pushes hardest is validation. Building successfully proves almost nothing about a cross build. The interesting question is how you know the artifact is correct: file and readelf to confirm the machine type and interpreter, readelf -d to inspect NEEDED entries and RPATH, objdump to check the float ABI tags, running the test suite under qemu-user in CI, and finally a smoke test on real hardware for the classes of failure emulation cannot reproduce.`,
    whenToUse: [
      'Building for embedded Linux boards, set-top boxes, or automotive ECUs where the device has no compiler and no room for one',
      'CI matrices that publish arm64 and amd64 artifacts from a single runner architecture without paying for emulated compile time',
      'Consuming a Yocto or Buildroot SDK, where the vendor hands you a matched compiler plus sysroot plus environment script',
      'Producing Windows binaries from Linux CI via mingw-w64, or macOS universal binaries covering both arm64 and x86_64 slices',
      'Any WebAssembly or bare-metal target, where there is no possibility of a native build at all',
    ],
    keyConcepts: [
      {
        term: 'Build / host / target',
        definition: 'Autotools terminology for three machines: build runs the compiler, host runs the produced binary, target is the architecture a produced compiler will emit for. Only Canadian crosses have a meaningful target. CMake inverts the vocabulary: CMAKE_SYSTEM_NAME is the autotools host, CMAKE_HOST_SYSTEM_NAME is the autotools build.',
      },
      {
        term: 'GNU target triple',
        definition: 'The arch-vendor-os-abi identifier that names a toolchain configuration, for example aarch64-unknown-linux-gnu or arm-none-eabi. The ABI field is load-bearing: gnueabi and gnueabihf differ in how floating point arguments are passed, and mixing them produces wrong results rather than link errors. gcc -dumpmachine prints the triple a compiler was built for.',
      },
      {
        term: 'Sysroot',
        definition: 'A directory tree mirroring the target filesystem for compile and link purposes: usr/include with target and kernel headers, usr/lib and lib with target libraries and their symlinks, and pkgconfig data with sysroot-relative prefixes. Passing --sysroot re-roots the compiler built-in search paths rather than merely appending to them.',
      },
      {
        term: 'Toolchain file',
        definition: 'A CMake script loaded before compiler detection via --toolchain or -DCMAKE_TOOLCHAIN_FILE. It sets CMAKE_SYSTEM_NAME, CMAKE_SYSTEM_PROCESSOR, the CMAKE_<LANG>_COMPILER paths, CMAKE_SYSROOT, and the find-root-path modes. Setting CMAKE_SYSTEM_NAME is what makes CMAKE_CROSSCOMPILING true.',
      },
      {
        term: 'CMAKE_FIND_ROOT_PATH_MODE_*',
        definition: 'Four variables (PROGRAM, LIBRARY, INCLUDE, PACKAGE) controlling per-category search behaviour. ONLY searches only the re-rooted paths, NEVER ignores them and uses the host root, BOTH searches both. The standard cross configuration is PROGRAM NEVER plus LIBRARY, INCLUDE and PACKAGE set to ONLY.',
      },
      {
        term: 'CMAKE_STAGING_PREFIX',
        definition: 'Where the install tree lands on the build machine, as distinct from CMAKE_INSTALL_PREFIX, which stays the runtime location on the target and is what gets baked into rpaths and generated config files. Omitting it means either installing over your own system or corrupting every prefix-derived path.',
      },
      {
        term: 'CMAKE_CROSSCOMPILING_EMULATOR',
        definition: 'A command CMake prefixes when it needs to execute a target binary during a cross build. It is used for try_run generated executables, avoiding manual population of TryRunResults.cmake, and it seeds the CROSSCOMPILING_EMULATOR target property so tests run under the emulator too. Accepts a semicolon-separated command plus arguments since CMake 3.15.',
      },
      {
        term: 'Multiarch',
        definition: 'Debian and Ubuntu scheme for co-installing libraries from different architectures by relocating them to /usr/lib/<gnu-triplet>. Enabled with dpkg --add-architecture arm64 and used with package suffixes like libssl-dev:arm64. Distinct from multilib, which is several ABIs of one architecture under lib and lib64.',
      },
    ],
    approach: [
      'Pin the exact triple and libc first — decide aarch64-linux-gnu versus aarch64-linux-musl, and hard-float versus soft-float, before choosing a toolchain; changing it later invalidates every prebuilt dependency',
      'Obtain a sysroot that matches the deployment image, not merely the architecture — prefer the Yocto or Buildroot SDK the image was built from, or an rsync of the device rootfs with absolute symlinks relativised',
      'Write one checked-in toolchain file per target: CMAKE_SYSTEM_NAME, CMAKE_SYSTEM_PROCESSOR, compiler paths, CMAKE_SYSROOT, CMAKE_STAGING_PREFIX, and all four find-root-path modes',
      'Export PKG_CONFIG_SYSROOT_DIR and PKG_CONFIG_LIBDIR so pkg-config resolves target .pc files instead of the host set — this is the most common leak that survives a correct CMake toolchain file',
      'Audit every configure-time run probe: replace try_run with if(NOT CMAKE_CROSSCOMPILING) plus a known value, or set CMAKE_CROSSCOMPILING_EMULATOR and let CMake run it',
      'Verify the artifact mechanically before shipping — file for machine type and interpreter, readelf -d for NEEDED and RPATH, and readelf -A on ARM for the float ABI attribute',
      'Run the test suite under qemu-user in CI via binfmt_misc or CMAKE_CROSSCOMPILING_EMULATOR, and keep one hardware smoke job for the failure classes emulation cannot reproduce',
    ],
    pitfalls: [
      'Leaving CMAKE_FIND_ROOT_PATH_MODE_LIBRARY at its BOTH default so find_package resolves a host x86-64 library, which either fails at link with "file in wrong format" or produces a binary that will not start on the device',
      'Setting CMAKE_FIND_ROOT_PATH_MODE_PROGRAM to ONLY as well, which breaks the build the moment it needs a host tool such as protoc, flex, or a code generator that must execute on the build machine',
      'Building against a newer sysroot than the deployment image, producing GLIBC_2.35 symbol version references that the device glibc cannot satisfy — the build is green and the device fails at exec time',
      'Mixing gnueabi and gnueabihf objects, which links without complaint on some toolchains and then passes floating point arguments through the wrong registers at runtime',
      'Forgetting CMAKE_STAGING_PREFIX and running make install, which either writes into the build machine /usr or bakes staging paths into installed config files and pkg-config data',
      'Treating a green qemu-user test run as full validation, when user-mode emulation covers CPU and syscall semantics but not device drivers, real timing, page-size differences, or hardware errata',
    ],
    keyQuestions: [
      {
        question: 'Write a CMake toolchain file for an aarch64 Linux target and explain every line.',
        answer: `A production toolchain file is short, and every line is load-bearing.

\`\`\`cmake
# aarch64-linux-gnu.cmake
set(CMAKE_SYSTEM_NAME      Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)

set(TC /opt/toolchains/aarch64-none-linux-gnu)
set(CMAKE_SYSROOT \${TC}/aarch64-none-linux-gnu/libc)

set(CMAKE_C_COMPILER   \${TC}/bin/aarch64-none-linux-gnu-gcc)
set(CMAKE_CXX_COMPILER \${TC}/bin/aarch64-none-linux-gnu-g++)

set(CMAKE_STAGING_PREFIX /work/stage)

set(CMAKE_FIND_ROOT_PATH \${CMAKE_SYSROOT} /work/deps-aarch64)
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
\`\`\`

CMAKE_SYSTEM_NAME is the CMake identifier of the platform being built for. Setting it at all is what tells CMake this is a cross build; CMAKE_CROSSCOMPILING becomes true as a consequence. Everything downstream — the emulator handling, the try_run behaviour, the find-root-path re-rooting — keys off this one assignment.

CMAKE_SYSTEM_PROCESSOR names the target architecture. It does not change compiler behaviour by itself; it is what project code and third-party config files branch on, so it must be spelled the way those consumers expect (aarch64, not arm64, on Linux).

CMAKE_SYSROOT is passed to the compiler as --sysroot and re-roots the built-in header and library search paths. Without it the cross GCC will happily open the build machine /usr/include.

The compiler variables are set to absolute paths. Use absolute paths, not bare names — a bare name is resolved against PATH, and PATH in CI is not the PATH you tested with.

CMAKE_STAGING_PREFIX is where install actually writes on the build machine. CMAKE_INSTALL_PREFIX remains the runtime location on the device (leave it at /usr) because that value is what ends up in generated pkg-config files, rpaths, and any path computed from CMAKE_INSTALL_PREFIX in project code.

CMAKE_FIND_ROOT_PATH lists roots that get prepended to every find_ search. Listing both the sysroot and a separate directory of cross-built dependencies is the normal shape: vendor libraries from the sysroot, your own dependencies from the staging area.

The four mode variables split the search by category, which is the crucial insight. PROGRAM is NEVER because the executables a build needs — pkg-config, protoc, flex, python, moc — must run on the build machine, and re-rooting their lookup would find aarch64 binaries you cannot execute. LIBRARY, INCLUDE, and PACKAGE are ONLY because those artifacts must come from the target. Leaving them at the default BOTH is the single most common cross-compilation bug.

Two things this file does not cover, and a strong answer mentions them: pkg-config needs PKG_CONFIG_SYSROOT_DIR and PKG_CONFIG_LIBDIR exported in the environment because it does not consult CMake variables, and any dependency fetched by FetchContent will be configured with this same toolchain, which is usually what you want but occasionally means a host tool gets cross-built by accident.

Invoke with cmake --toolchain /path/aarch64-linux-gnu.cmake -S . -B build-arm64, or the older -DCMAKE_TOOLCHAIN_FILE= form. The file is read very early, before compiler detection, which is why it can set compiler paths at all.`,
      },
      {
        question: 'A colleague says the cross build works but the binary segfaults on the device. Walk through your diagnosis.',
        answer: `Start by proving what you actually produced, then prove what the device can actually load. Do not touch the source until both are established.

Step one, identify the artifact:

\`\`\`bash
file ./myapp
# ELF 64-bit LSB pie executable, ARM aarch64, dynamically linked,
# interpreter /lib/ld-linux-aarch64.so.1, ...
\`\`\`

Check the machine type and, critically, the interpreter path. If the interpreter is /lib/ld-linux-aarch64.so.1 but the device is a musl system expecting /lib/ld-musl-aarch64.so.1, the kernel cannot even start the process — that presents as an immediate crash or "No such file or directory" on a binary that plainly exists.

Step two, check dynamic dependencies and search paths:

\`\`\`bash
readelf -d ./myapp | grep -E 'NEEDED|RPATH|RUNPATH'
\`\`\`

Then compare each NEEDED soname against what is on the device. A missing library is a clean load failure; a present-but-older library is the interesting case.

Step three, symbol versions. This is the failure that gets through CI:

\`\`\`bash
readelf --dyn-syms ./myapp | grep GLIBC_ | sort -u
\`\`\`

If the binary references GLIBC_2.35 and the device ships glibc 2.31, the loader aborts with "version GLIBC_2.35 not found". The root cause is a sysroot newer than the deployment image. The fix is not to patch the binary; it is to build against a sysroot extracted from the actual image. The same applies to GLIBCXX_ and CXXABI_ versions from libstdc++, which is a separate and independently versioned surface.

Step four, ABI attributes, on 32-bit ARM specifically:

\`\`\`bash
readelf -A ./myapp | grep -i 'FP\\|ABI_VFP'
\`\`\`

A hard-float binary against soft-float libraries does not necessarily fail to link. It fails by passing doubles in the wrong registers, which shows up as garbage values or a crash deep inside a math routine, far from the actual mistake.

Step five, look for host contamination. Grep the link line for any -L or -I pointing at a build-machine path, and check whether any find_package resolved to a host directory:

\`\`\`bash
grep -rE '/usr/(include|lib)/x86_64' build/CMakeCache.txt
\`\`\`

Any hit there means a find-root-path mode was left at BOTH.

Step six, reproduce under emulation before touching hardware:

\`\`\`bash
qemu-aarch64 -L /opt/rootfs-aarch64 ./myapp
\`\`\`

The -L flag sets the ELF interpreter prefix so QEMU resolves the guest loader and libraries from the sysroot rather than the host. If it crashes identically under QEMU you have a fast reproduction loop and can run it under gdb. If it runs correctly under QEMU but fails on the device, you have narrowed it to something emulation does not model: page size (a 64K-page kernel versus 4K assumptions), an unsupported CPU extension, a driver, or an actual hardware difference.

The ordering matters and is what the interviewer is grading. Load-time failures (interpreter, NEEDED, symbol versions) are diagnosed with readelf in seconds and account for the large majority of "works in CI, crashes on device". Only after excluding those is it worth debugging the program.`,
      },
      {
        question: 'How do you handle configure-time checks that need to run a program, when you cannot run target binaries?',
        answer: `Every build system has this hole because feature detection historically meant compile-and-run. Under cross-compilation the compile half still works and the run half does not.

CMake try_run: CMake compiles the probe successfully and then, seeing CMAKE_CROSSCOMPILING is true, cannot execute it. It creates two cache entries and expects a human to fill them: the run result variable holding the exit code the target would have produced, and <runResultVar>__TRYRUN_OUTPUT holding the stdout and stderr the target would have produced, the latter created only when RUN_OUTPUT_VARIABLE or OUTPUT_VARIABLE was requested. Configure stops until they are set. CMake's own documentation is blunt about this: use try_run only if really required, and prefer branching on CMAKE_CROSSCOMPILING to supply an alternative.

There are three legitimate strategies, in order of preference.

First, delete the check. Most run-probes are asking questions that a modern language standard already answers, or that can be answered by a compile-only check. Endianness is the classic example: instead of running a program to inspect byte order, use a compile-time check or, in C++20, std::endian. Structure sizes can be determined by static_assert rather than by printing sizeof at runtime. A compile-only probe works identically under cross-compilation.

Second, supply the answer explicitly for cross builds:

\`\`\`cmake
if(CMAKE_CROSSCOMPILING)
  set(HAVE_WORKING_FOO 1 CACHE INTERNAL "known true for our targets")
else()
  try_run(RUN_RC COMPILE_OK \${CMAKE_BINARY_DIR} \${CMAKE_SOURCE_DIR}/probe.c)
  ...
endif()
\`\`\`

This is honest and auditable — the assumption is written down next to the check. CMake also supports a TryRunResults.cmake style file of pre-seeded answers that can be checked into the repository per target.

Third, run it for real under an emulator:

\`\`\`cmake
set(CMAKE_CROSSCOMPILING_EMULATOR /usr/bin/qemu-aarch64;-L;/opt/rootfs-aarch64)
\`\`\`

CMAKE_CROSSCOMPILING_EMULATOR only applies when CMAKE_CROSSCOMPILING is true. It names a command used to run executables built for the target, and the documentation states directly that it will be used to run try_run generated executables, which avoids manual population of the TryRunResults.cmake file. Since CMake 3.15 it accepts a semicolon-separated list where the first element is the command and the rest are arguments, which is how the -L sysroot flag gets in. Since CMake 3.28 it can be initialised from an environment variable. It also seeds the CROSSCOMPILING_EMULATOR target property, so tests registered with add_test get run through the emulator as well — one variable fixes both probes and the test suite.

The autotools equivalent is AC_RUN_IFELSE, whose fourth argument is the cross-compilation fallback. If a configure.ac omits that argument, configure will error out with "cannot run test program while cross compiling", and the fix is to supply the fallback rather than to force a value with a cache variable on the command line — though ac_cv_ overrides on the configure line are the standard field workaround for third-party packages you do not control.

The interview signal here is knowing that the emulator approach is the good one for a Linux-to-Linux cross with a matching sysroot, and that it is unavailable for bare-metal or for targets whose behaviour depends on hardware, where you must fall back to writing the assumption down explicitly.`,
      },
      {
        question: 'Compare the realistic ways to obtain a cross toolchain, and when you would pick each.',
        answer: `There are five common sources and they trade off sharply on control versus effort.

Distro cross packages. On Debian or Ubuntu, apt install gcc-aarch64-linux-gnu g++-aarch64-linux-gnu gives you a working compiler in one command, and multiarch gives you the matching libraries: dpkg --add-architecture arm64 then apt install libssl-dev:arm64 places target headers and libraries under /usr/lib/aarch64-linux-gnu, forming a sysroot the package manager maintains for you. Pick this when your target runs the same distro release as your build machine. It is the lowest-effort path and it is also the least controllable — you get whatever glibc the distro ships, and it will drift when the base image is updated.

Vendor toolchains from ARM or Linaro. Prebuilt, tested, versioned tarballs with a bundled sysroot. Pick these when you want reproducibility without owning the build, and when the vendor's glibc baseline is old enough to satisfy your oldest deployed device. They are the pragmatic default for ARM Linux work. The limitation is that the bundled sysroot is generic, so any third-party library your application needs must be cross-built separately.

crosstool-NG. A configuration framework that builds a complete toolchain from source — binutils, the C library, GCC, and optionally gdb — driven by a menuconfig workflow with sample configurations as starting points. Pick it when you need an exact glibc version, an unusual libc such as musl or uClibc-ng, a specific GCC version for a certification requirement, or a target no vendor ships. The cost is build time and a configuration surface with many opportunities to produce a subtly wrong toolchain.

Yocto or Buildroot SDKs. This is the correct answer for embedded product work. You are already building the device image with Yocto or Buildroot; those systems can emit an SDK containing a toolchain plus the exact sysroot for that image, plus an environment-setup script that exports CC, CXX, CFLAGS, LDFLAGS, PKG_CONFIG_SYSROOT_DIR, and a ready-made CMake toolchain file. The decisive advantage is that the sysroot is the image, so the entire class of "built against a newer glibc than the device has" bugs disappears. Pick this whenever an image build exists.

Zig cc. The zig compiler ships a clang front end plus bundled libc headers and glibc stubs for many versions, so a single small download cross-compiles C and C++ to a wide range of targets with syntax like zig cc -target aarch64-linux-gnu.2.28. The version suffix pinning the glibc baseline is genuinely useful — it lets you target an old glibc from a modern machine without maintaining an old sysroot. Pick it for portable CLI tools and CGo builds, where the dependency surface is small. Do not pick it for a large C++ application with many system dependencies: you still need a sysroot for third-party libraries, and unusual toolchain behaviour interacts badly with build systems that assume GCC.

The decision rule to state out loud: if a device image build already exists, take the SDK from it, because sysroot-image parity is worth more than any other property. If not, take a vendor toolchain and pin it. Reach for crosstool-NG only when a specific libc or compiler version requirement makes the prebuilt options unusable, and treat zig cc as a sharp tool for small, dependency-light artifacts rather than a general replacement.`,
      },
      {
        question: 'Design a CI pipeline that builds and tests for three architectures from x86-64 runners.',
        answer: `Separate three concerns that are frequently conflated: where compilation happens, where tests execute, and what gets published.

Compilation strategy. Cross-compile on native x86-64 runners rather than emulating the compiler. Running GCC itself under qemu-user is typically five to twenty times slower, which turns a five-minute build into an hour. The matrix axis is the target triple, and each entry selects a checked-in toolchain file:

\`\`\`yaml
strategy:
  matrix:
    include:
      - target: x86_64-linux-gnu
        toolchain: cmake/toolchains/native.cmake
      - target: aarch64-linux-gnu
        toolchain: cmake/toolchains/aarch64-linux-gnu.cmake
      - target: armv7-linux-gnueabihf
        toolchain: cmake/toolchains/armv7-linux-gnueabihf.cmake
\`\`\`

Every job runs the same command shape, which is the point — the only thing that varies is the toolchain file:

\`\`\`bash
cmake -S . -B build/\${{ matrix.target }} \\
      --toolchain \${{ matrix.toolchain }} \\
      -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build build/\${{ matrix.target }}
\`\`\`

Sysroot provisioning. Do not download and unpack a sysroot on every job. Publish it as a container image, one per target, containing the toolchain and the matching sysroot, and tag it with the same version as the device image it came from. The job then runs inside that container and the toolchain file paths are stable. This also makes the sysroot-to-image correspondence auditable: an image tag change is a reviewable commit rather than an invisible URL fetch.

Test execution. Register qemu-user through binfmt_misc once at the start of the job so target binaries execute transparently:

\`\`\`bash
docker run --rm --privileged tonistiigi/binfmt --install arm64,arm
ctest --test-dir build/aarch64-linux-gnu --output-on-failure
\`\`\`

The alternative, which keeps privileges out of the job, is CMAKE_CROSSCOMPILING_EMULATOR in the toolchain file; CMake then uses it both for try_run probes and as the default CROSSCOMPILING_EMULATOR target property, so ctest invokes each test under the emulator without any change to the test definitions.

Be explicit about what emulation does not cover, because this is where the interview goes. QEMU user mode translates instructions and forwards syscalls to the host kernel. It therefore does not reproduce device drivers, real-time behaviour, interrupt latency, hardware errata, or a target kernel with a different page size. Anything timing-sensitive or hardware-touching needs a real board. The practical structure is a hardware smoke-test stage triggered on merges to main against a small pool of self-hosted runners with actual devices attached, running a fast subset — start, connect, exercise the primary path, exit cleanly — while the exhaustive suite runs under emulation on every pull request.

Caching. ccache or sccache keyed on the target triple, plus a Ninja build directory cache, cuts incremental cross builds substantially. Key the cache on the toolchain container digest, not on a branch name, so a toolchain bump invalidates it correctly.

Publishing. Each matrix job uploads its artifact with the triple in the name, and a final job assembles multi-arch container images with docker buildx imagetools create or, for release tarballs, a manifest listing every artifact with its checksum. The verification step worth adding before publish is mechanical: run file and readelf -d on each artifact and assert the machine type and interpreter match the triple the job claimed to build. That catches a misconfigured toolchain file immediately rather than after a device fails to boot.`,
      },
    ],
    references: [
      'https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html',
      'https://cmake.org/cmake/help/latest/variable/CMAKE_FIND_ROOT_PATH_MODE_PROGRAM.html',
      'https://cmake.org/cmake/help/latest/command/try_run.html',
      'https://cmake.org/cmake/help/latest/variable/CMAKE_CROSSCOMPILING_EMULATOR.html',
      'https://wiki.debian.org/Multiarch/HOWTO',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 11. Qt for Build Engineers
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-qt-development',
    title: 'Qt for Build Engineers',
    icon: 'grid',
    color: '#ea580c',
    questions: 5,
    description: 'Qt from the build side: module structure, the moc/uic/rcc/qmlcachegen code generators and what they do to the build graph, qmake versus CMake in Qt 6, static builds, and LGPL as a build constraint.',
    visualizations: [
      {
        title: 'Qt code generators and the build graph they create',
        image: '/diagrams/devops/nb-11-qt-development.png',
        description: `Qt is not plain C++. It is C++ plus a code-generation step, and understanding that step is the entire difference between an app developer's view of Qt and a build engineer's view.

The module structure:
Qt 6 splits into Essentials and Add-ons. The Essentials are Qt Core (core non-graphical classes used by other modules), Qt GUI (base classes for graphical user interface components), Qt Widgets (classes to extend Qt GUI with C++ widgets), Qt QML (classes for the QML and JavaScript languages), Qt Quick (a declarative framework for building highly dynamic applications with custom UIs), Qt Network (classes to make network programming easier and more portable), Qt Test (unit testing), and Qt D-Bus (inter-process communication over D-Bus).

What linking each pulls in matters for deployment size and for what has to exist on the target. Qt6::Core alone gives you the object model, containers, event loop, file and string handling, and no windowing dependency at all — a headless service can link only Core. Qt6::Gui adds the Qt Platform Abstraction layer, which means it drags in a platform plugin requirement and, on Linux, an X11 or Wayland client stack. Qt6::Widgets adds the classic desktop widget set on top of Gui. Qt6::Quick is a separate universe: it pulls in Qt6::Qml, a JavaScript engine, and a scene graph that requires working GPU or software rasterisation. A team that links Widgets and Quick into the same binary is shipping two complete UI stacks.

The generators:
moc, the Meta-Object Compiler, is a preprocessor that reads header files looking for class declarations containing the Q_OBJECT macro and generates C++ source files with meta-object code. That generated code is what makes signals and slots, runtime type information, dynamic properties, and QMetaObject introspection work. From myclass.h it produces moc_myclass.cpp. From a .cpp file containing a Q_OBJECT class it produces foo.moc, which must be included at the bottom of foo.cpp with #include "foo.moc".

uic, the User Interface Compiler, turns a Qt Designer .ui XML file into a header (ui_mainwindow.h) containing a setupUi function that constructs the widget tree in code. No runtime XML parsing — it is a pure build-time translation.

rcc, the Resource Compiler, reads a .qrc manifest and embeds the listed files into the binary as a virtual filesystem addressable with ":/images/logo.png" paths. It can also produce an external .rcc binary blob to be registered at runtime.

qmlcachegen compiles QML to bytecode at build time and embeds it, removing the parse and compile cost at startup. Its stricter sibling behaviour in qt_add_qml_module can also surface QML type errors at build time rather than at first navigation.

Why this changes the build graph:
Each generator introduces a build edge that a naive Makefile does not know about. moc_myclass.cpp depends on myclass.h; the executable depends on the object built from moc_myclass.cpp. If myclass.h gains a Q_OBJECT macro and nothing re-runs moc, the class has no meta-object, and the linker reports the single most recognisable Qt error in existence: undefined reference to vtable for MyClass. The Qt documentation is explicit that this indicates the moc-generated code was not compiled, the generated object file was not linked, or the .moc file was not included where required, and that rerunning qmake or CMake usually resolves it.

CMake automates this with CMAKE_AUTOMOC, which qt_standard_project_setup turns on. AUTOMOC scans sources for the Q_OBJECT and Q_GADGET macros, runs moc where needed, and wires the generated files into the target. CMAKE_AUTOUIC does the same for .ui files and CMAKE_AUTORCC for .qrc files. This is convenient and it is also the source of a specific failure mode: AUTOMOC only scans files that are listed in a target's sources. A header that is not listed anywhere and is only reached through an include chain does not get scanned, so its Q_OBJECT class silently gets no meta-object.

moc constraints worth knowing because they surface as build failures: a class template cannot use Q_OBJECT; with multiple inheritance QObject must be the first base class; function pointers cannot be signal or slot parameters; types in signal and slot signatures must be fully qualified because moc does not resolve using-declarations; nested classes cannot have signals or slots; and return types cannot be references.

qmake versus CMake:
Qt 5 was qmake-first with a .pro file, and CMake support was a community-maintained afterthought. Qt 6 inverted this — Qt itself is built with CMake, the documentation leads with CMake, and the Qt-specific commands qt_add_executable, qt_add_library, qt_add_qml_module, qt_add_resources, and qt_add_translations are first-class. A build engineer joining a Qt 5 codebase should expect a qmake-to-CMake migration to be on the roadmap and should understand that qmake's implicit conventions (CONFIG += ..., automatic moc, automatic install paths) have to be made explicit in CMake.`,
      },
      {
        title: 'Quick-fire interview answers — Qt build',
        description: `Q: What does moc actually do, and why does Qt need it?
A: moc reads headers, finds classes declaring Q_OBJECT, and generates a C++ file containing the QMetaObject for that class — the string tables and dispatch code that implement signals and slots, dynamic properties, and runtime introspection. Standard C++ has no reflection, so Qt generates the reflection data at build time instead. The output is moc_myclass.cpp from a header, or myfile.moc from a .cpp, and it must be compiled and linked with the rest of the project.

Q: What causes "undefined reference to vtable for MyWidget"?
A: The moc output for that class was never compiled or never linked. Common causes: Q_OBJECT was added to a header after the build system had already generated its dependency graph, so a stale build did not re-run moc; the header is not listed in any target's sources so AUTOMOC never scanned it; or a Q_OBJECT class lives in a .cpp file and the corresponding #include "foo.moc" line is missing. Reconfiguring, or a clean build, is the usual immediate fix; the durable fix is listing the header in the target sources.

Q: What is the difference between qt_add_executable and add_executable?
A: qt_add_executable wraps CMake's built-in command with Qt-specific handling — plugin importing for static builds, platform-specific target properties, and bundle handling on macOS and iOS. On desktop the difference is small; on Android, iOS, and WebAssembly it is the difference between a working artifact and a bare ELF nobody can run. Use qt_add_executable in Qt 6 projects unconditionally.

Q: How do you enable moc in a CMake project?
A: Either set CMAKE_AUTOMOC to ON, or call qt_standard_project_setup, which turns it on for you along with sensible defaults for AUTOUIC and AUTORCC. AUTOMOC scans every source and header listed in a target for the Q_OBJECT and Q_GADGET macros and adds the generated files to the build automatically.

Q: Static Qt or shared Qt?
A: Shared is the default and the LGPL-safe option, because LGPLv3 requires that the end user be able to relink the application against a modified Qt. Static linking makes deployment trivially simple — one executable, no plugin directory, no platform-plugin failure mode — but under LGPLv3 it obliges you to ship the object files or an equivalent mechanism that lets a user relink. Static builds of Qt are also a separate compile of Qt itself, so you own building and maintaining it. Commercial licensing removes the relink obligation, which is a common and legitimate reason to buy it.

Q: What breaks first when migrating Qt 5 to Qt 6?
A: The build system, because qmake .pro files have to become CMakeLists.txt with explicit find_package(Qt6 REQUIRED COMPONENTS ...) and target_link_libraries against namespaced Qt6:: targets. After that, removed and relocated APIs: QTextStream::setCodec is gone in favour of setEncoding, several Qt 5 modules were removed outright, and OpenGL APIs moved into the Qt OpenGL module. The Qt5Compat module carries a set of the removed classes forward, which is a migration crutch rather than a destination.`,
      },
    ],
    introduction: `Most Qt material is written for application developers. A build engineer needs a different mental model: Qt is a C++ framework with a mandatory code-generation phase, a plugin-based runtime that fails in a distinctive way when packaged wrong, and a dual-licensing model that imposes real constraints on how you are allowed to link.

The code-generation phase is the defining fact. Qt's signals and slots, dynamic properties, and runtime introspection are not compiler features — they are implemented by moc, which scans headers for the Q_OBJECT macro and emits a C++ file containing the meta-object data for each class it finds. That output has to be compiled and linked like any other translation unit. Everything a build engineer finds strange about Qt follows from this: the extra dependency edges, the stale-build failures, the "undefined reference to vtable" error that every Qt developer has seen and few can explain precisely.

There are four generators in practice. moc handles Q_OBJECT classes. uic converts Qt Designer .ui XML into a header with a setupUi function. rcc embeds files listed in a .qrc manifest into the binary as a virtual filesystem. qmlcachegen precompiles QML into bytecode so startup does not pay parse cost. CMake automates all four through CMAKE_AUTOMOC, CMAKE_AUTOUIC, and CMAKE_AUTORCC, which qt_standard_project_setup enables, but automation hides the dependency structure rather than removing it, and the failures still require understanding what is underneath.

Qt 6 made CMake the primary build system. Qt itself is now built with CMake, the official documentation leads with it, and there is a set of Qt-specific commands — qt_add_executable, qt_add_library, qt_add_qml_module, qt_add_resources — that do more than their plain CMake counterparts, particularly around static plugin importing and mobile platform targets. Qt 5 codebases are still overwhelmingly qmake, so migration work is a realistic thing to be asked about.

The module structure drives both link time and deployment footprint. Qt Core is the non-graphical foundation and can be linked alone by a headless service. Qt GUI brings in the Qt Platform Abstraction layer and with it the platform-plugin requirement. Qt Widgets is the classic desktop widget set on top of GUI. Qt Quick and Qt QML are a separate declarative stack with a JavaScript engine and a scene graph. Knowing which of these a binary actually needs is the difference between a 40 MB deployment and a 200 MB one.

Licensing is where build engineering meets legal, and it is a fair interview question rather than a trivia one. Qt under LGPLv3 permits keeping application source proprietary when Qt is dynamically linked, but requires that the user be able to change and relink the Qt library used in the application — including reverse engineering for that purpose — and be able to run the resulting modified binary. Static linking does not forbid LGPL use, but it makes satisfying the relink obligation substantially harder, which is why "static Qt" and "commercial license" tend to appear in the same architectural conversation.`,
    whenToUse: [
      'Owning the build for a desktop or embedded C++ application that uses Qt Widgets or Qt Quick for its interface',
      'Migrating a Qt 5 qmake project to Qt 6 and CMake, where the implicit conventions of .pro files have to become explicit CMake',
      'Diagnosing moc-related link failures — undefined vtables, missing meta-objects, or signals that connect at runtime and never fire',
      'Deciding whether to consume a prebuilt Qt from the online installer or build Qt from source for a constrained or unusual target',
      'Making the static-versus-shared and LGPL-versus-commercial decision, where the build topology and the licence obligation are the same conversation',
    ],
    keyConcepts: [
      {
        term: 'Q_OBJECT and moc',
        definition: 'Q_OBJECT is a macro that marks a class for processing by the Meta-Object Compiler. moc reads headers, finds those classes, and generates a C++ file (moc_myclass.cpp) containing the QMetaObject that implements signals and slots, dynamic properties, and runtime type information. Standard C++ has no reflection, so Qt generates it at build time.',
      },
      {
        term: 'CMAKE_AUTOMOC / AUTOUIC / AUTORCC',
        definition: 'CMake features that scan a target sources for Q_OBJECT and Q_GADGET, .ui files, and .qrc files respectively, run the corresponding generator, and add the output to the build. qt_standard_project_setup enables AUTOMOC. The critical limitation is that scanning only covers files actually listed in a target.',
      },
      {
        term: 'uic and rcc',
        definition: 'uic converts a Qt Designer .ui XML file into ui_<name>.h containing a setupUi function that builds the widget tree in code — no runtime XML parsing. rcc reads a .qrc manifest and compiles the listed files into the binary as a virtual filesystem reachable through paths starting with a colon.',
      },
      {
        term: 'qt_standard_project_setup',
        definition: 'A Qt 6 CMake command that applies project-wide defaults: it sets CMAKE_AUTOMOC to ON, enables AUTOUIC for GUI projects, and configures C++ standard and output directory conventions. Calling it near the top of a Qt 6 CMakeLists.txt removes a page of boilerplate.',
      },
      {
        term: 'qt_add_executable',
        definition: 'A wrapper around add_executable that adds Qt-specific handling for plugins and platform customisation. On Android, iOS, and WebAssembly it produces the platform-appropriate artifact rather than a bare executable, and in static builds it arranges for required plugins to be imported.',
      },
      {
        term: 'Namespaced Qt targets',
        definition: 'find_package(Qt6 REQUIRED COMPONENTS Core Widgets Network) provides imported targets Qt6::Core, Qt6::Widgets, Qt6::Network. Linking them with target_link_libraries propagates include directories, compile definitions, and transitive dependencies. Never hand-roll -lQt6Core or add Qt include paths manually.',
      },
      {
        term: 'Static versus shared Qt',
        definition: 'Shared is the default: the application loads Qt DLLs or shared objects at runtime and requires a plugin directory. Static links Qt into the executable, eliminating deployment complexity and the platform-plugin failure mode, but requires building Qt from source with -static and creates an LGPLv3 relinking obligation that shared linking does not.',
      },
      {
        term: 'LGPLv3 relinking obligation',
        definition: 'Under LGPLv3, the recipient must be able to change and relink the Qt library used in the application, including reverse engineering for that purpose, and must be able to run the modified result. Dynamic linking satisfies this naturally. You must also supply the complete corresponding source of the Qt version used, including any modifications, or a written offer for it.',
      },
    ],
    approach: [
      'Establish which Qt modules the application genuinely needs and link only those — Core for headless, add Gui and Widgets for desktop, and treat Quick as a separate decision because it brings a JavaScript engine and scene graph',
      'Call qt_standard_project_setup early and use find_package(Qt6 REQUIRED COMPONENTS ...) with namespaced Qt6:: targets, never manual include paths or -l flags',
      'List every header containing a Q_OBJECT class in its target sources so AUTOMOC actually scans it — this single rule prevents most vtable link failures',
      'Pin the Qt version explicitly, including the patch level, and record how Qt was obtained (online installer, distro package, aqtinstall, source build) so the build is reproducible on a fresh machine',
      'Decide static versus shared deliberately and document the licensing consequence in the same commit — the two decisions are inseparable',
      'For Qt 5 to Qt 6 migration, convert the build first and get a green shared-library build before touching any deprecated API, then remove Qt5Compat dependencies one module at a time',
      'Add a build-time check that fails if a Q_OBJECT header is present but unlisted, and treat "works after a clean build" as a bug report rather than a resolution',
    ],
    pitfalls: [
      'Adding Q_OBJECT to an existing class and getting undefined reference to vtable, then fixing it with a clean build instead of listing the header in the target sources, so the same failure returns for every developer who pulls the change',
      'Relying on AUTOMOC while keeping headers out of target sources — AUTOMOC only scans listed files, so a header reached purely through an include chain is silently skipped and its class gets no meta-object',
      'Putting a Q_OBJECT class in a .cpp file and forgetting the trailing #include "foo.moc", which fails to link with the same vtable error and confuses everyone because the header case works',
      'Linking Qt6::Widgets and Qt6::Quick into one binary because two teams picked different UI stacks, doubling the deployment footprint and the plugin surface',
      'Treating a static Qt build as a purely technical decision, then discovering during a legal review that shipping under LGPLv3 requires a mechanism for the user to relink',
      'Migrating Qt 5 to Qt 6 by fixing API deprecations before converting the build system, which means every fix is validated against a build that is itself about to be replaced',
    ],
    keyQuestions: [
      {
        question: 'Explain the moc pipeline end to end and what breaks when it goes wrong.',
        answer: `moc is a preprocessor that runs before the C++ compiler. It reads header files searching for class declarations containing the Q_OBJECT macro and generates C++ source files with meta-object code for each one it finds.

What the generated code contains: a static QMetaObject instance holding the class name, a string table of signal, slot, and property names with their signatures, the qt_metacall dispatch function that maps an integer index to an actual member function invocation, and the qt_static_metacall entry point. This is what makes QObject::connect work at runtime with either the old string-based syntax or, partially, the newer pointer-to-member syntax, and it is what powers QMetaObject::invokeMethod, dynamic properties, and the Qt property system that QML binds to.

The file naming convention matters because it determines who is responsible for including what. From myclass.h, moc produces moc_myclass.cpp — a standalone translation unit that gets compiled and linked normally, and which nobody includes. From foo.cpp containing a Q_OBJECT class declared inline in that file, moc produces foo.moc, which is not standalone and must be included at the very bottom of foo.cpp with #include "foo.moc".

Under CMake, CMAKE_AUTOMOC handles the mechanics. It scans every source and header listed in a target for the Q_OBJECT and Q_GADGET macros, invokes moc, and adds the outputs to the target automatically. qt_standard_project_setup turns it on. Under qmake, the HEADERS variable drives the same process, and the documentation notes the qmake-specific optimisation of including moc_*.cpp into your .cpp files to combine compilation and improve build speed.

What breaks, in descending order of frequency:

Undefined reference to vtable for MyClass. This is the signature failure. The Qt documentation identifies three causes: the moc-generated code was not compiled, the generated object file was not linked, or the .moc file was not included where required. Mechanically, the vtable for a polymorphic class is emitted in the translation unit that defines its first non-inline virtual function; for a Q_OBJECT class, several of those virtuals (metaObject, qt_metacast, qt_metacall) are defined in the moc output. No moc output means no vtable means a link error.

The stale-build variant. A header gains Q_OBJECT but the build system has already computed its dependency graph. CMake will normally re-run AUTOMOC on reconfigure, but if the header is not listed in the target sources it will never be scanned regardless of how many times you reconfigure. The clean build appears to fix it — because a fresh configure happens to scan more, or because the developer adds the header while cleaning — and then it comes back on the next machine. The permanent fix is to list every Q_OBJECT header in target_sources.

Silent no-meta-object. Worse than a link error, because there is no error. If a class declares signals and slots but the connect call uses a base class that does have a meta-object, connect can succeed and the signal simply never reaches the slot. Qt 5 and 6 will usually print a runtime warning through the logging category, which is why suppressing Qt warnings in CI is a bad idea.

moc-imposed language limits that surface as build errors: class templates cannot use Q_OBJECT; with multiple inheritance QObject must be the first base class; function pointers are not valid signal or slot parameter types; types in signatures must be fully qualified because moc does not perform name lookup; nested classes cannot declare signals or slots; and a signal or slot return type cannot be a reference. Each of these produces a moc diagnostic rather than a compiler one, which is why the message looks unfamiliar.

For a build engineer the operational rule is short: every header declaring a Q_OBJECT class belongs in a target's source list, and any failure that disappears after a clean build is an unlisted header until proven otherwise.`,
      },
      {
        question: 'Write the CMakeLists.txt for a Qt 6 Widgets application and justify each command.',
        answer: `\`\`\`cmake
cmake_minimum_required(VERSION 3.21)
project(MyApp VERSION 1.4.0 LANGUAGES CXX)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Network)

qt_standard_project_setup()

qt_add_executable(myapp
    src/main.cpp
    src/mainwindow.cpp
    src/mainwindow.h
    src/mainwindow.ui
)

qt_add_resources(myapp "assets"
    PREFIX "/icons"
    FILES icons/open.svg icons/save.svg
)

target_link_libraries(myapp PRIVATE
    Qt6::Core Qt6::Gui Qt6::Widgets Qt6::Network
)

set_target_properties(myapp PROPERTIES
    WIN32_EXECUTABLE ON
    MACOSX_BUNDLE ON
)
\`\`\`

find_package(Qt6 REQUIRED COMPONENTS ...) locates Qt and creates imported targets. Each component you name becomes a Qt6::<Component> target carrying its own include directories, compile definitions, and transitive dependencies. Name only what you use — adding Qt6::Quick because it was in an example drags a QML engine into a Widgets application. Note that Widgets depends on Gui which depends on Core, so listing all three is redundant but harmless and makes the intent legible.

qt_standard_project_setup applies Qt project defaults, most importantly setting CMAKE_AUTOMOC to ON so moc runs automatically for anything declaring Q_OBJECT, and enabling AUTOUIC so .ui files are processed. Without it you write those variables by hand and inevitably forget one.

qt_add_executable rather than add_executable. It wraps the built-in command with Qt-specific handling for plugins and platform customisation. On desktop the practical delta is modest; on Android it produces the APK-ready target, on iOS the app bundle, on WebAssembly the correct output shape, and in a static Qt build it arranges the plugin import machinery. Using it unconditionally means the same CMakeLists works when someone adds a mobile target.

Listing mainwindow.h in the sources is deliberate and is the single most important line for build reliability. AUTOMOC scans a target's listed files. A header that only appears via #include from a .cpp is not scanned, so its Q_OBJECT class gets no meta-object and the link fails with an undefined vtable. Listing headers costs nothing and closes that hole.

Listing mainwindow.ui in the sources hands it to AUTOUIC, which runs uic and generates ui_mainwindow.h into the build directory, adding that directory to the include path. The source file then does #include "ui_mainwindow.h" and calls setupUi. There is no runtime XML parsing — uic emits plain C++ that constructs the widget tree.

qt_add_resources compiles the listed files into the binary through rcc, reachable at runtime as ":/icons/open.svg". The PREFIX argument sets the virtual directory. Embedding assets this way eliminates an entire class of deployment bug, because the files cannot go missing relative to the executable.

target_link_libraries with namespaced targets and PRIVATE visibility. PRIVATE is right for an executable because nothing links against it. For a library, the choice between PRIVATE and PUBLIC determines whether consumers inherit the Qt include paths, and getting that wrong is how a header-only consumer ends up unable to find QObject.

WIN32_EXECUTABLE ON suppresses the console window on Windows by using the GUI subsystem entry point. MACOSX_BUNDLE ON produces a .app bundle rather than a bare Mach-O, which is a prerequisite for macdeployqt, code signing, and notarisation.

What is deliberately absent: no manual include_directories, no -lQt6Core, no hand-written moc custom commands. Every one of those is a symptom of fighting the Qt CMake API rather than using it.`,
      },
      {
        question: 'You inherit a Qt 5 qmake project and are asked to move it to Qt 6 with CMake. Plan it.',
        answer: `Sequence the work so that each stage is independently verifiable, and resist the temptation to fix APIs and build systems in the same commit.

Stage one: inventory. Read the .pro and .pri files and write down what they actually do, because qmake conventions are implicit and CMake is not. Extract the QT += list (which becomes find_package components), CONFIG flags, DEFINES, INCLUDEPATH, LIBS, the SOURCES/HEADERS/FORMS/RESOURCES lists, any custom compilers or extra targets, install rules, and any scope blocks keyed on platform. Custom qmake compilers and extra targets are where the surprises live; they have no direct CMake equivalent and each needs a decision.

Stage two: CMake with Qt 5 still. Convert the build system while staying on Qt 5, using find_package(Qt5 COMPONENTS ...) and Qt5:: targets. This is the highest-value ordering choice in the whole plan, because it isolates build-system risk from API risk. When the CMake build produces a binary that behaves identically to the qmake one, the build conversion is proven. Qt 5.15 supports CMake well enough for this to be a comfortable intermediate state.

Stage three: compile against Qt 6 and triage. Switch to find_package(Qt6 ...) and Qt6:: targets, add qt_standard_project_setup, replace add_executable with qt_add_executable, and build. The compiler error list is the migration backlog. Expect three categories.

Removed modules. Qt 6.0 removed a set of Qt 5 modules outright; the porting guide directs you to the removed-modules list and the changes-to-modules list first, because a removed module is an architectural decision, not a mechanical fix.

Relocated APIs. OpenGL classes moved into the Qt OpenGL module, so code that included them from Qt GUI now needs an explicit component. Platform integration APIs changed shape and need checking per target platform.

Mechanical replacements. QTextStream::setCodec was removed in favour of QTextStream::setEncoding. Classes such as QRegExp and QTextCodec moved into the Qt5Compat module rather than remaining in Core.

Stage four: use Qt5Compat as scaffolding, not as a destination. Adding find_package(Qt6 COMPONENTS Core5Compat) and linking Qt6::Core5Compat gets you compiling quickly. Then remove it one class at a time — QRegExp to QRegularExpression, QTextCodec to QStringConverter — with tests around each. Leaving Core5Compat linked permanently means carrying a compatibility shim into every future upgrade.

Stage five: harden. Define QT_DISABLE_DEPRECATED_UP_TO to 0x050F00 to make use of APIs deprecated as of Qt 5.15 a hard error, which prevents new code from reintroducing them. Then re-examine deployment, because it changed: qt_generate_deploy_app_script replaces hand-rolled windeployqt and macdeployqt invocations, and if the project uses QML, qt_add_qml_module replaces the Qt 5 pattern of a resource file plus manual registration.

Stage six: graphical regression testing. The porting guide specifically calls out testing for graphical regressions, because Qt 6 changed the rendering stack. High-DPI handling, font rendering, and the scene graph all behave differently in ways that compile fine and look wrong. Screenshot-diff tests on the main windows are worth building for this migration even if you never run them again.

Things to decide explicitly rather than drift into: whether to keep a shared Qt or move to static, since the CMake conversion is the natural moment; whether the project should adopt qt_add_qml_module if it uses QML, which reorganises the source tree; and which Qt 6 patch level to pin, because Qt 6 minor releases are not all long-term-support and picking a non-LTS branch commits you to more frequent upgrades.`,
      },
      {
        question: 'Static Qt versus shared Qt — walk through the build, deployment, and licensing consequences.',
        answer: `Three separate axes, and the interview answer has to keep them separate.

Build consequences. Shared is what every prebuilt Qt gives you: the online installer, distro packages, and aqtinstall all ship shared libraries. Static requires building Qt itself from source with the -static configure flag, which is a multi-hour compile you then own, version, and rebuild for every Qt update and every target. It also constrains what you can enable, because some Qt features and third-party integrations assume dynamic loading. If you go static you are taking on maintenance of a Qt build, and that should be a conscious staffing decision rather than a flag someone flipped.

Deployment consequences, which are the reason people want static. A shared Qt application needs the Qt libraries next to it and, critically, a plugins directory with the right subdirectories. All Qt GUI applications require a plugin implementing the Qt Platform Abstraction layer — qwindows.dll on Windows, libqcocoa.dylib on macOS, libqxcb.so or the Wayland equivalent on Linux — located in a platforms subdirectory of the distribution directory. Getting that wrong produces the most common Qt deployment failure there is. A static build makes the entire category disappear: one executable, no plugin directory, no search-path configuration, no qt.conf. For a command-line-adjacent tool or a single-file utility that is a large simplification. Note the wrinkle that the Windows deployment documentation flags: plugins cannot be deployed alongside a static build in the usual sense, because a static application must import the plugins it needs at link time rather than discovering them on disk. Qt's CMake API handles that import automatically when you use qt_add_executable, which is one more reason to use it.

Licensing consequences, and this is where a strong candidate separates from a weak one. Qt's LGPLv3 offer permits keeping application source code proprietary in the case of dynamic linking, provided the application is a work that uses the library. The obligation that makes this work is the user's right to change and relink the Qt library used in the application — including reverse engineering — and to actually run the modified result on the device. Dynamic linking satisfies that naturally: the user replaces the shared library and runs the application.

Static linking does not automatically forbid LGPL use, but it makes satisfying the relink obligation substantially harder, because the user now needs a way to produce a new executable. In practice that means shipping the application object files or an equivalent mechanism so a recipient can relink against their own Qt, which most commercial teams find unacceptable because it exposes far more than they intended. Separately, and regardless of linking mode, you must deliver the complete corresponding source code of the Qt version used including any modifications you made, or a written offer with instructions on how to obtain it. Note also that not every Qt module is available under LGPLv3 — several add-ons are offered under GPLv3 or commercial terms only, and linking one of those into a proprietary application is a licensing error that a build engineer is well placed to catch, because it is visible in the link line.

The commercial licence removes the relink and source-availability obligations, which is precisely why "we want a static build" and "we should buy commercial Qt" are the same conversation. Qt's own guidance says as much: when LGPL compliance appears challenging, the commercial option is often the best choice.

The answer to give: default to shared Qt, because it is the prebuilt path, the LGPL-safe path, and the one with the most deployment tooling behind it. Choose static when deployment simplicity or startup time genuinely matters and either the application is open source under a compatible licence or you hold a commercial licence. Never choose static purely to avoid learning how plugin deployment works.`,
      },
      {
        question: 'Which Qt modules does a given application actually need, and how do you find out?',
        answer: `The question matters because module choice determines link time, binary size, deployment footprint, the plugin surface you have to package, and what has to exist on the target platform.

The layering, from Qt's own module list. Qt Core provides the core non-graphical classes used by other modules — the object model, containers, strings, files, the event loop, threading, JSON, settings. Nothing in Core requires a display. Qt GUI provides base classes for graphical user interface components and, importantly, brings the Qt Platform Abstraction layer, which is what introduces the platform-plugin requirement and, on Linux, a dependency on an X11 or Wayland client stack. Qt Widgets extends Qt GUI with C++ widgets — the classic desktop control set. Qt QML provides classes for the QML and JavaScript languages, which means a JavaScript engine. Qt Quick is a declarative framework for building highly dynamic applications with custom UIs, layered on QML, and brings a scene graph that wants working GPU acceleration or a software rasteriser. Qt Network provides portable network programming classes; on many platforms it pulls in a TLS backend, which becomes a deployment concern of its own.

The practical consequences of that layering:

A headless daemon that wants QObject, signals and slots, and JSON parsing links Qt6::Core and nothing else. It has no platform plugin requirement at all, which means it deploys as a normal C++ binary. Teams routinely link Widgets into such a service by copying a template, and then wonder why it fails to start on a machine with no display.

A desktop application links Core, Gui, and Widgets, and must package the platform plugin plus imageformats plugins for any format beyond the built-ins, plus the style plugin on platforms that use one.

A Quick application links Core, Gui, Qml, and Quick, and its deployment includes the QML module tree, not merely libraries — which is why windeployqt has a --qmldir flag to scan sources for imports.

Linking both Widgets and Quick into one process happens in real codebases, usually because two teams made different UI choices, and it means shipping two complete UI stacks and paying both plugin surfaces.

How to find out what is actually needed, in order of reliability. Start from the include lines rather than from what currently links: grep the sources for Qt includes and map each class to its module through the Qt class documentation, which names the module for every class. Then check what the linker really required — ldd or otool -L on the built binary, or readelf -d for NEEDED entries — and compare that against the module list you declared. Discrepancies are informative in both directions: a NEEDED entry you did not ask for is a transitive dependency you should understand, and a declared component with no corresponding NEEDED entry is a component you can drop.

Then remove components one at a time from find_package and target_link_libraries and rebuild. The linker is the authority. This is tedious exactly once, and the result belongs in a comment in CMakeLists explaining why each component is present.

One trap worth naming: a component can be required at runtime without appearing in any include. Qt Network's TLS support and Qt Sql's database drivers are loaded as plugins, so a build can succeed and link cleanly while the deployed application fails on first use because the sqldrivers or tls plugin directory was never packaged. Static analysis of includes will not catch that. Only running the application, exercising the feature, against a packaged build will.`,
      },
    ],
    references: [
      'https://doc.qt.io/qt-6/moc.html',
      'https://doc.qt.io/qt-6/cmake-get-started.html',
      'https://doc.qt.io/qt-6/qtmodules.html',
      'https://doc.qt.io/qt-6/portingguide.html',
      'https://www.qt.io/licensing/open-source-lgpl-obligations',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 12. Qt Deployment and Packaging
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-qt-deployment',
    title: 'Qt Deployment and Packaging',
    icon: 'package',
    color: '#ea580c',
    questions: 5,
    description: 'Everything a Qt application needs at runtime beyond the executable: plugins, qt.conf, the deploy tools, platform installers, and why the platform-plugin error is the most common Qt shipping failure.',
    visualizations: [
      {
        title: 'What ships with a Qt application, and how it finds it',
        image: '/diagrams/devops/nb-12-qt-deployment.png',
        description: `A Qt application is not a single binary. It is a binary plus shared libraries plus a plugin tree, and the runtime discovers that tree by a search algorithm you must either satisfy or override.

The single most common Qt deployment failure:

  This application failed to start because no Qt platform plugin could be initialized.
  Reinstalling the application may fix this problem.
  Available platform plugins are: ...

The cause is always the same. All Qt GUI applications require a plugin implementing the Qt Platform Abstraction layer. On Windows that plugin is qwindows.dll, on macOS libqcocoa.dylib, on Linux libqxcb.so or libqwayland-*.so. The documentation is specific: the file must be located within a platforms subdirectory under the distribution directory. Copy the executable and the Qt DLLs but forget the platforms directory and the application dies before main does anything visible. The message is unhelpful because it lists the plugins Qt found rather than the paths it searched.

The plugin categories that ship with a real application:

  platforms/      required, always. qwindows, qcocoa, qxcb, qwayland
  styles/         desktop look-and-feel on platforms that use a style plugin
  imageformats/   qjpeg, qgif, qsvg, qwebp. PNG is built in; everything else is a plugin
  iconengines/    qsvgicon, needed if SVG icons are used
  sqldrivers/     qsqlite, qsqlpsql, qsqlmysql. Absent driver equals runtime failure, not link failure
  tls/            OpenSSL or Schannel backends for QSslSocket
  multimedia/     backend plugins when Qt Multimedia is used

The pattern that catches teams out is that plugins are loaded at runtime by name. A missing image format plugin does not fail to link and does not fail at startup — it fails the first time someone opens a JPEG, in production, with a blank image and no error dialog.

How Qt finds plugins:
Qt searches the application executable directory first. The documentation gives the example that if the application is in C:\\Program Files\\MyApp and it has a style plugin, Qt looks in C:\\Program Files\\MyApp\\styles. Beyond that there are three override mechanisms.

qt.conf overrides the hard-coded paths compiled into the Qt library. QLibraryInfo searches for it in a defined order: first :/qt/etc/qt.conf through the resource system, then on macOS the Resources directory inside the application bundle, then the directory containing the application executable. Its [Paths] section takes entries including Prefix (default: the application directory), Plugins (default: plugins), QmlImports (default: qml), Libraries (default: lib), Binaries (default: bin), and Translations. Absolute paths are used as given; everything else is relative to Prefix, which on Windows and Linux resolves relative to the executable directory and on macOS relative to the Contents folder of the bundle.

QT_PLUGIN_PATH is an environment variable set before running the application, with multiple paths separated by the system path separator.

QCoreApplication::addLibraryPath and setLibraryPaths do the same thing programmatically, and must be called before the QApplication that needs the plugin is constructed — which is impossible for the platform plugin, since it is needed to construct QApplication in the first place. That is why the platform plugin specifically must be found on disk or compiled in.

The deploy tools:
windeployqt inspects an executable and collects the Qt libraries, plugins, QML modules, and runtime dependencies it needs into a ready-to-run folder. Useful flags include --dir and --plugindir for output layout, --qmldir to scan a source tree for QML imports, --dry-run to see the plan, --no-compiler-runtime, and --skip-plugin-types or --exclude-plugins to trim. It does not reliably capture application-specific third-party libraries.

macdeployqt copies Qt libraries into the bundle as private frameworks under Contents/Frameworks and plugins under Contents/PlugIns, fixes the install names, and can produce a disk image with -dmg. It also handles signing with -codesign=<identity> and -hardened-runtime, which matters because notarisation requires hardened runtime.

linuxdeployqt is community-maintained and produces an AppDir suitable for AppImage packaging. Linux has no single blessed answer, which is why AppImage, Flatpak, and native .deb/.rpm all remain in use.

Qt 6 added a build-system-integrated path. qt_generate_deploy_app_script produces a script that you install(SCRIPT ...), and at install time it calls qt_deploy_runtime_dependencies, which on Windows and macOS drives windeployqt or macdeployqt underneath, and on Linux uses CMake's file(GET_RUNTIME_DEPENDENCIES) and additionally deploys non-Qt project libraries, excluding system directories by default. It accepts GENERATE_QT_CONF, plugin filters such as NO_PLUGINS, INCLUDE_PLUGIN_TYPES and EXCLUDE_PLUGIN_TYPES, and DEPLOY_TOOL_OPTIONS for passing platform tool flags through. This is the modern answer: deployment described in CMakeLists rather than in a shell script that drifts.`,
      },
      {
        title: 'Quick-fire interview answers — Qt deployment',
        description: `Q: An application starts on the build machine and fails on a clean machine with "no Qt platform plugin could be initialized". What happened?
A: The platforms plugin directory was not shipped, or was shipped in the wrong place. Qt requires the QPA plugin — qwindows.dll, libqcocoa.dylib, or libqxcb.so — in a platforms subdirectory of the distribution directory. On the build machine the application finds it through the Qt installation paths compiled into the library; on a clean machine those paths do not exist. The fix is running windeployqt, macdeployqt, or the CMake deploy script rather than copying DLLs by hand. Setting QT_DEBUG_PLUGINS to 1 prints every path Qt searched, which turns a guess into a diagnosis.

Q: What is qt.conf for?
A: It overrides the hard-coded paths compiled into the Qt library. QLibraryInfo looks for it first as :/qt/etc/qt.conf in the resource system, then in the macOS bundle Resources directory, then next to the executable. Its [Paths] section sets Prefix, Plugins, QmlImports, Libraries, Binaries and others; relative entries resolve against Prefix, which itself resolves relative to the executable directory on Windows and Linux and to Contents on macOS. It is the right tool when your layout is not the default one.

Q: Why did the application ship fine and then fail the first time a user opened a JPEG?
A: The qjpeg image format plugin was not deployed. PNG support is built into Qt GUI; JPEG, GIF, WebP, and SVG are plugins loaded on demand. Nothing fails at link time or at startup — the failure surfaces at first use as an empty image with no dialog. The same shape of bug hits sqldrivers and the TLS backend plugins.

Q: What does qt_generate_deploy_app_script give you over calling windeployqt in a shell script?
A: It puts deployment in the build description instead of alongside it. You call it in CMakeLists and install the generated script; at install time it invokes qt_deploy_runtime_dependencies, which uses windeployqt on Windows and macdeployqt on macOS, and on Linux uses file(GET_RUNTIME_DEPENDENCIES) and also picks up non-Qt project libraries. One CMake target then produces a deployable tree on all three platforms, and plugin filtering and qt.conf generation are arguments rather than shell flags.

Q: How do you notarise a Qt application for macOS?
A: Produce a proper .app bundle (MACOSX_BUNDLE ON), run macdeployqt to embed Qt as private frameworks under Contents/Frameworks and plugins under Contents/PlugIns, then sign every nested binary — frameworks and plugins included — with a Developer ID Application certificate and hardened runtime enabled, sign the bundle last, and submit for notarisation with notarytool before stapling the ticket. Signing the outer bundle without signing the embedded frameworks and plugins is the usual reason notarisation is rejected.

Q: Static build to avoid deployment — what is the catch?
A: It genuinely removes the plugin directory and the whole platform-plugin failure class, because required plugins are imported at link time. The catches are that you must build Qt from source with -static and maintain that build yourself, and that under LGPLv3 you take on the obligation to let recipients relink the application against their own Qt. Shipping object files to satisfy that is unacceptable to most proprietary products, which is why static Qt and a commercial licence usually travel together.`,
      },
    ],
    introduction: `Deployment is where Qt projects fail publicly. The build is green, the application runs on every developer machine, and the first clean install dies with a dialog that names plugins it found rather than paths it looked in. Almost every Qt team has shipped this bug at least once, and being able to explain it precisely is a reliable signal of having actually operated a Qt product rather than only built one.

The root cause is that Qt is a plugin architecture at runtime. The windowing integration, image format decoders, SQL drivers, TLS backends, icon engines, and styles are all separate shared objects loaded by name when they are first needed. During development they are found through paths compiled into the Qt libraries pointing at the Qt installation. On a clean machine those paths do not exist, and unless the plugin tree was shipped in a layout Qt can discover, the lookup fails. For the platform plugin the failure is fatal and immediate. For everything else it is deferred to first use, which is far worse: the qjpeg plugin going missing does not fail to link, does not fail at startup, and surfaces weeks later as a user reporting blank images.

There are three mechanisms for pointing Qt at a plugin tree, and a build engineer should know all three and when each applies. The default is relative to the executable directory. qt.conf overrides the compiled-in paths and is searched for in a defined order — the Qt resource system first, then the macOS bundle Resources directory, then next to the executable. The QT_PLUGIN_PATH environment variable and QCoreApplication::addLibraryPath cover the remaining cases, with the caveat that neither can help the platform plugin, because that plugin is needed to construct the application object that would set the path.

The tooling has improved considerably. windeployqt and macdeployqt have existed for years and remain the workhorses on their platforms, collecting Qt libraries, plugins, QML modules, and runtime dependencies into a distributable tree. Qt 6 added qt_generate_deploy_app_script and qt_deploy_runtime_dependencies, which move deployment into CMake: on Windows and macOS they drive the platform tools underneath, and on Linux they use CMake's own runtime-dependency resolution and additionally deploy non-Qt project libraries. The practical effect is one cross-platform description of deployment instead of three divergent shell scripts.

Above the deploy tools sits actual packaging, which differs sharply per platform and is not something the Qt tools do for you. Windows means an MSI, an NSIS installer, or Inno Setup, plus Authenticode signing. macOS means a .app bundle, Developer ID signing of every nested framework and plugin, hardened runtime, and notarisation. Linux means choosing among AppImage, Flatpak, and native .deb and .rpm packages, each with a different dependency philosophy. The Qt Installer Framework offers a cross-platform alternative — a toolset for creating custom online and offline installers for Linux, Windows, and macOS, with a maintenance tool that lets users add, remove, and update components afterwards.

The escape hatch is a static build, which eliminates the plugin tree entirely by importing required plugins at link time. It genuinely deletes the whole failure class. It also requires building Qt from source and, under LGPLv3, creates an obligation to let recipients relink — which is why the static-build conversation and the commercial-licence conversation are the same one.`,
    whenToUse: [
      'Shipping a Qt desktop application to end users on Windows, macOS, or Linux rather than running it from a development tree',
      'Debugging a startup failure that reproduces only on machines without Qt installed — the definition of a deployment problem rather than a build problem',
      'Moving from hand-written per-platform deployment shell scripts to the Qt 6 CMake deployment API',
      'Preparing a macOS release that must pass Gatekeeper, which requires signing every embedded framework and plugin, hardened runtime, and notarisation',
      'Deciding between AppImage, Flatpak, and native packages for Linux, where the bundling philosophy determines your support burden',
    ],
    keyConcepts: [
      {
        term: 'QPA platform plugin',
        definition: 'The plugin implementing the Qt Platform Abstraction layer, required by every Qt GUI application: qwindows.dll on Windows, libqcocoa.dylib on macOS, libqxcb.so or a Wayland plugin on Linux. It must live in a platforms subdirectory under the distribution directory. Its absence produces the "no Qt platform plugin could be initialized" failure before the application draws anything.',
      },
      {
        term: 'Deferred plugin failures',
        definition: 'Plugins outside platforms are loaded on first use, not at startup. A missing qjpeg gives blank JPEGs, a missing sqldrivers entry gives a database open failure, a missing TLS backend gives failing HTTPS requests. None of these fail the build or the launch, which is why packaging must be validated by exercising features, not by checking that the application starts.',
      },
      {
        term: 'qt.conf',
        definition: 'An INI file that overrides the paths compiled into the Qt library. Searched for as :/qt/etc/qt.conf in the resource system, then the macOS bundle Resources directory, then the executable directory. Its [Paths] section sets Prefix, Plugins, QmlImports, Libraries, Binaries, Translations and more; relative values resolve against Prefix.',
      },
      {
        term: 'windeployqt',
        definition: 'The Windows deployment tool. Inspects an executable and collects Qt libraries, plugins, QML modules, compiler runtime, and identifiable third-party dependencies into a runnable folder. Key flags include --dir, --plugindir, --qmldir for QML import scanning, --dry-run, --no-compiler-runtime, and plugin filters. It does not reliably find all application-specific third-party libraries.',
      },
      {
        term: 'macdeployqt',
        definition: 'The macOS tool that embeds Qt libraries into the bundle as private frameworks under Contents/Frameworks and plugins under Contents/PlugIns, rewrites install names, and optionally produces a disk image with -dmg. Supports -codesign=<identity>, -no-codesign, and -hardened-runtime. Deploys platform, imageformats, sqldrivers, accessibility, style, and print plugins unless -no-plugins is given.',
      },
      {
        term: 'qt_generate_deploy_app_script',
        definition: 'Qt 6 CMake command producing an install-time script that calls qt_deploy_runtime_dependencies. On Windows and macOS it drives windeployqt or macdeployqt; on Linux it uses file(GET_RUNTIME_DEPENDENCIES) and also deploys non-Qt project libraries, excluding system directories by default. Arguments include GENERATE_QT_CONF, NO_PLUGINS, INCLUDE_PLUGIN_TYPES, EXCLUDE_PLUGIN_TYPES, and DEPLOY_TOOL_OPTIONS.',
      },
      {
        term: 'Qt Installer Framework',
        definition: 'A toolset for creating custom online and offline installers for Linux, Windows, and macOS. Driven by a config.xml plus a packages directory describing components. Produces an installer and a maintenance tool that lets end users add, remove, update, and reconfigure components after installation, which is how in-place updates are delivered.',
      },
      {
        term: 'QT_DEBUG_PLUGINS',
        definition: 'Environment variable that, set to 1, makes Qt print every plugin path it searches and every load attempt with the reason for failure. It converts the uninformative platform-plugin error into an exact list of directories that were checked, and is the first thing to reach for on any deployment failure.',
      },
    ],
    approach: [
      'Build a proper platform artifact first — WIN32_EXECUTABLE on Windows, MACOSX_BUNDLE on macOS — because the deploy tools operate on those shapes, not on bare executables',
      'Express deployment in CMake with qt_generate_deploy_app_script plus install(SCRIPT ...) rather than per-platform shell scripts, so all three platforms share one description',
      'Trim the plugin set deliberately with INCLUDE_PLUGIN_TYPES or EXCLUDE_PLUGIN_TYPES, and record which features depend on which plugins so trimming is reversible knowledge rather than guesswork',
      'Validate on a genuinely clean machine — a fresh container or VM with no Qt installed and no developer tooling — and treat "works on my machine after uninstalling Qt" as insufficient',
      'Exercise features during validation, not just startup: open a JPEG, open the database, make an HTTPS request, print, and load an SVG icon, since each maps to a different plugin category',
      'On macOS sign inner-to-outer — every framework and plugin first, bundle last — with hardened runtime enabled, then notarise and staple; on Windows Authenticode-sign both the executable and the installer',
      'Wire packaging into CI so the installer is produced and smoke-tested on every tagged build, and keep QT_DEBUG_PLUGINS output from a failing run in the artifact set for post-mortems',
    ],
    pitfalls: [
      'Copying the executable and the Qt shared libraries but not the platforms directory, producing the "no Qt platform plugin could be initialized" error on the first clean machine that runs the build',
      'Validating deployment by launching the application only, so deferred plugin failures — missing imageformats, sqldrivers, or TLS backends — ship to users and surface as silent feature breakage',
      'Signing the macOS bundle without signing the embedded Qt frameworks and plugins, which passes local testing and fails notarisation or Gatekeeper on the user machine',
      'Running windeployqt against a QML application without --qmldir, so the QML module tree is not scanned and the application fails to resolve imports at runtime',
      'Assuming the deploy tool catches all third-party dependencies — windeployqt explicitly may not capture application-specific third-party libraries, so a bundled codec or database client silently goes missing',
      'Treating Linux as one target and shipping a .deb built on the newest Ubuntu, which pins the glibc and libstdc++ baseline higher than most users have; AppImage or Flatpak exist precisely to decouple that',
    ],
    keyQuestions: [
      {
        question: 'Diagnose "This application failed to start because no Qt platform plugin could be initialized" from first principles.',
        answer: `This error means Qt could not load the plugin implementing the Qt Platform Abstraction layer. Every Qt GUI application requires one — qwindows.dll on Windows, libqcocoa.dylib on macOS, libqxcb.so or a Wayland plugin on Linux — and Qt cannot construct QGuiApplication without it. The failure is therefore before main does anything observable, which is why there is no logging and no partial UI.

The message is misleading in a specific way: it lists the plugins Qt managed to find rather than the directories it searched. When the list is empty, that is the actual information, and it is easy to miss.

Step one, get the real diagnostic. Set QT_DEBUG_PLUGINS to 1 and run again:

\`\`\`bash
QT_DEBUG_PLUGINS=1 ./myapp
\`\`\`

Qt then prints every directory it consulted, every candidate file it tried to load, and the specific reason each load failed. That converts guesswork into one of four concrete answers.

Cause one, the plugin was never shipped. Qt searches the application executable directory and subdirectories under it — the documentation gives the example that an application in C:\\Program Files\\MyApp with a style plugin causes Qt to look in C:\\Program Files\\MyApp\\styles. The platform plugin must be in a platforms subdirectory of the distribution directory. If the packaging step copied the executable and the Qt libraries but not the plugin tree, this is the cause and it is by far the most common one. The fix is not to copy the file by hand; it is to run windeployqt, macdeployqt, or the CMake deploy script so the whole tree comes across consistently.

Cause two, it was shipped in the wrong place. A flat directory containing qwindows.dll next to the executable does not work — Qt looks for platforms/qwindows.dll. Layout matters, not mere presence.

Cause three, the plugin is present but its own dependencies are not. QT_DEBUG_PLUGINS reveals this clearly, because the load attempt fails with a message about a missing library rather than a missing file. On Linux the xcb platform plugin has a long chain of libxcb-* dependencies that are trivially present on a developer workstation and frequently absent in a minimal container. On Windows the plugin needs the same Qt6Core and Qt6Gui DLLs the application does, plus the MSVC runtime.

Cause four, an ABI or version mismatch. A plugin built against a different Qt patch series, or a debug plugin loaded by a release build on Windows, is rejected. The debug/release mismatch is a Windows-specific trap because the debug plugin is named with a d suffix and mixing the two CRTs is not allowed.

Overrides, once the cause is known. qt.conf is the durable fix when your layout is legitimately non-default: it overrides the paths compiled into the Qt library, and QLibraryInfo searches for it as :/qt/etc/qt.conf in the resource system, then in the macOS bundle Resources directory, then in the executable directory. A minimal file:

\`\`\`ini
[Paths]
Prefix = .
Plugins = lib/qtplugins
\`\`\`

QT_PLUGIN_PATH set in the environment is the quick confirmation that a path problem is the cause, but it is a diagnostic rather than a shipping solution. QT_QPA_PLATFORM_PLUGIN_PATH narrows the same idea to the platform plugin specifically.

QCoreApplication::addLibraryPath cannot help here and knowing why is the detail that separates a good answer from a great one: you would have to call it before constructing the application object, but the platform plugin is required to construct that object. For every other plugin category addLibraryPath is a viable programmatic option; for the platform plugin it is not, which is why that one has to be findable on disk or compiled into a static build.

The permanent fix, stated as a rule: never assemble a Qt deployment by hand. Use the tooling, and validate on a machine that has never had Qt installed.`,
      },
      {
        question: 'Set up cross-platform deployment for a Qt 6 CMake project.',
        answer: `The Qt 6 answer is to describe deployment in CMakeLists and let the platform differences be handled underneath, rather than maintaining three shell scripts that drift.

\`\`\`cmake
qt_add_executable(myapp ...)

set_target_properties(myapp PROPERTIES
    WIN32_EXECUTABLE ON
    MACOSX_BUNDLE ON
)

install(TARGETS myapp
    BUNDLE  DESTINATION .
    RUNTIME DESTINATION bin
)

qt_generate_deploy_app_script(
    TARGET myapp
    OUTPUT_SCRIPT deploy_script
    NO_UNSUPPORTED_PLATFORM_ERROR
)
install(SCRIPT \${deploy_script})
\`\`\`

The target properties come first because the deploy tools operate on platform-correct artifacts. WIN32_EXECUTABLE selects the GUI subsystem entry point so no console window appears. MACOSX_BUNDLE produces a .app rather than a bare Mach-O, which is a hard prerequisite for macdeployqt, code signing, and notarisation.

qt_generate_deploy_app_script writes a script and hands you its path in the variable named by OUTPUT_SCRIPT. It runs at install time, not at configure time, which is the design point — it inspects the built binary. NO_UNSUPPORTED_PLATFORM_ERROR makes the call a no-op rather than a hard error on platforms where deployment is not supported, which keeps a shared CMakeLists usable everywhere.

What that script does per platform, from the qt_deploy_runtime_dependencies documentation. On Windows and macOS it drives windeployqt and macdeployqt respectively, which deploy the Qt-specific libraries and plugins. On Linux there is no equivalent vendor tool, so it uses CMake's file(GET_RUNTIME_DEPENDENCIES) and, notably, deploys non-Qt project libraries as well, excluding system library directories by default. That last behaviour is the one to remember, because it means the Linux path bundles more than the Windows and macOS paths do.

For finer control, call qt_deploy_runtime_dependencies directly from a custom deploy script. Its relevant arguments: EXECUTABLE, which is required and accepts a generator expression such as \$<TARGET_FILE:MyApp> or a bundle path; ADDITIONAL_EXECUTABLES, ADDITIONAL_LIBRARIES and ADDITIONAL_MODULES for helper binaries and loadable modules whose dependencies also need resolving; GENERATE_QT_CONF to emit a qt.conf, which happens automatically for macOS bundles; NO_PLUGINS, INCLUDE_PLUGIN_TYPES and EXCLUDE_PLUGIN_TYPES to control the plugin set; and DEPLOY_TOOL_OPTIONS, available since Qt 6.7, which passes flags straight through to macdeployqt or windeployqt. DEPLOY_TOOL_OPTIONS is how code-signing identity and compiler-runtime decisions get expressed without leaving CMake.

Trimming is worth doing explicitly. A default deployment pulls every plugin category the tool thinks might be relevant, which for a Widgets application that never touches a database still ships sqldrivers. EXCLUDE_PLUGIN_TYPES with the categories you know are unused cuts tens of megabytes. Do this deliberately and leave a comment naming the features that would break, because the failure mode for over-trimming is a deferred runtime failure rather than a build error.

QML applications need one extra consideration. windeployqt has a --qmldir flag that scans a source tree for QML imports, and without it the QML module tree is not resolved. When using qt_add_qml_module the CMake deployment path handles this, and qt_generate_deploy_qml_app_script is the QML-aware variant to use instead of the plain app script.

Then the packaging layer, which the Qt tools do not cover. Feed the deployed tree into CPack or a platform-native tool: WiX or NSIS for an MSI or setup executable on Windows, a signed and notarised DMG on macOS, and AppImage, Flatpak, or CPack DEB and RPM generators on Linux. The Qt Installer Framework is the cross-platform alternative when you want one installer experience on all three and, importantly, a maintenance tool that lets users update components in place afterwards.

The verification step that belongs in CI: install the packaged artifact into a container or VM with no Qt present, launch it, and exercise one feature from each plugin category. Startup alone proves only that the platform plugin made it.`,
      },
      {
        question: 'Walk through packaging a Qt application for macOS so it passes Gatekeeper.',
        answer: `Gatekeeper requires a correctly structured bundle, a Developer ID signature over every executable piece of code inside it, hardened runtime, and a notarisation ticket. Qt makes the middle step harder than it is for a plain application, because the bundle ends up containing dozens of nested binaries.

Step one, produce a real bundle. Set MACOSX_BUNDLE ON on the target and supply a proper Info.plist through MACOSX_BUNDLE_INFO_PLIST or the individual MACOSX_BUNDLE_* properties: bundle identifier, version, minimum system version, and any usage-description strings for privacy-gated capabilities such as microphone or camera access. A missing usage-description string is a runtime crash on first use, not a warning.

Step two, embed Qt. macdeployqt copies the Qt libraries into the bundle as private frameworks and rewrites install names so the binary resolves them relative to the bundle rather than to the developer's Qt installation. The resulting structure is the standard one: Contents/MacOS for the executable, Contents/Frameworks for Qt and third-party frameworks, Contents/PlugIns for plugins, and Contents/Resources for resources. Unless -no-plugins is given, macdeployqt deploys the platform plugin, image format plugins, SQL drivers when Qt Sql is used, accessibility and style plugins, and print support.

The platform plugin requirement applies here exactly as on Windows: the macOS QPA plugin is libqcocoa.dylib and it must sit in a platforms subdirectory under the distribution directory, which inside a bundle means Contents/PlugIns/platforms.

Step three, sign inner to outer. This is where most attempts fail. Code signing on macOS is not recursive in the way people expect — a signature over the bundle does not validate nested Mach-O files that were themselves unsigned or that were modified after signing. Because macdeployqt rewrites install names, any signature Qt's own binaries carried from the Qt installation is invalidated by the copy. Every framework in Contents/Frameworks and every plugin in Contents/PlugIns must be signed individually, then the bundle signed last:

\`\`\`bash
find MyApp.app/Contents/Frameworks MyApp.app/Contents/PlugIns \\
  -type f \\( -name '*.dylib' -o -perm +111 \\) -print0 |
  xargs -0 -n1 codesign --force --timestamp --options runtime \\
     --sign "Developer ID Application: Example Inc (TEAMID)"

codesign --force --timestamp --options runtime --deep=false \\
  --entitlements entitlements.plist \\
  --sign "Developer ID Application: Example Inc (TEAMID)" MyApp.app
\`\`\`

--options runtime enables hardened runtime, which notarisation requires. --timestamp attaches a secure timestamp, also required. macdeployqt can do the signing itself via -codesign=<identity> together with -hardened-runtime, which is the simpler route when it covers your case; hand-signing is needed when there are non-Qt embedded binaries or entitlements involved.

Step four, verify before submitting. codesign --verify --deep --strict --verbose=4 MyApp.app catches unsigned nested code, and spctl --assess --type execute --verbose MyApp.app approximates the Gatekeeper decision locally. Doing both saves notarisation round trips.

Step five, notarise. Package the bundle into a DMG (macdeployqt -dmg does this, or use create-dmg for a nicer layout), submit with xcrun notarytool submit --wait, and on success staple the ticket with xcrun stapler staple so the DMG validates without a network round trip on the user machine. Staple the DMG and, if you distribute the bundle separately, the bundle too.

The Qt-specific gotchas worth naming: entitlements must cover what Qt actually does — a JIT-using QML engine may need appropriate entitlements, and network client access needs its entitlement under the App Sandbox if you sandbox at all; the hardened runtime blocks loading unsigned libraries, so any plugin loaded at runtime and not signed fails silently in a way that looks like a missing-plugin bug; and signing must happen after macdeployqt, never before, because the install-name rewriting invalidates existing signatures.`,
      },
      {
        question: 'Compare the Linux packaging options for a Qt application and pick one.',
        answer: `Linux has no single answer, and the honest response starts by naming what actually varies: how much of the runtime you bundle versus inherit from the host.

Native packages, .deb and .rpm. You declare dependencies on the distribution's Qt packages and ship only your application. Smallest artifact, cleanest integration with the system package manager, security updates to Qt arrive from the distribution without you doing anything. The cost is combinatorial: a package built against Ubuntu 24.04's Qt does not install on Debian 12 or Fedora 40, so supporting N distributions times M releases means building N times M packages, each in its own container. Choose this when your users are on a small, known set of distributions — an internal fleet, or a product with an explicitly supported matrix.

AppImage. A single executable file containing the application, Qt, and every non-system library, mounted as a squashfs at runtime. No installation, no root, runs on any distribution whose glibc is at least as new as the build machine's. That last clause is the entire engineering constraint: AppImage bundles upward but cannot bundle glibc itself, so you must build on the oldest distribution you intend to support. linuxdeployqt exists specifically for this and enforces the rule by refusing to run on a too-new base. Choose AppImage for direct-download desktop distribution where you want one file and no installer.

Flatpak. Bundles the application against a versioned runtime (the KDE runtime provides Qt) and runs it sandboxed with portal-mediated access to files, cameras, and the network. Strongest isolation, best update story through Flathub, and the runtime handles the Qt version so you are not bundling it yourself. The costs are real: the sandbox breaks assumptions about filesystem access, so anything that reads arbitrary paths or shells out to host tools needs portal work or filesystem permissions; and you inherit the runtime's Qt version rather than choosing it. Choose Flatpak for consumer desktop applications distributed through Flathub, especially KDE-adjacent ones.

Snap. Similar bundling and sandboxing story with Ubuntu-centric tooling and a single store. Worth mentioning for completeness; the interesting tradeoffs are the same as Flatpak's, with a smaller cross-distribution audience in practice.

A plain tarball with a launcher script. Ship the deployed tree with a wrapper that sets LD_LIBRARY_PATH and QT_PLUGIN_PATH before exec-ing the binary. Crude, but it works, it is trivial to build, and it is what many commercial Linux products actually ship. Better still, avoid the wrapper by setting RPATH to \$ORIGIN/../lib at link time and shipping a qt.conf next to the executable that points Plugins at the right subdirectory — then the binary is directly executable with no environment manipulation. Choose this for internal tools and for products where the user is a developer.

The Qt Installer Framework is the cross-platform option: it builds custom online and offline installers for Linux, Windows, and macOS from a config.xml plus a packages directory, and produces a maintenance tool the user runs later to add, remove, or update components. Choose it when you want one installer experience across all three platforms and, particularly, when in-place component updates matter more than native integration.

The recommendation to state: default to AppImage for direct distribution, because one artifact covers the field and the only discipline required is building on an old enough base. Add Flatpak when you want to be on Flathub and can afford the sandbox work. Build native packages only for a specific, enumerated support matrix — typically because an enterprise customer requires them. Whichever you pick, the glibc and libstdc++ baseline of the build container is the decision that actually determines who can run your software, and it should be pinned explicitly rather than inherited from whatever the CI image happens to be.`,
      },
      {
        question: 'How do you validate a Qt deployment in CI so packaging bugs cannot reach users?',
        answer: `The governing insight is that Qt deployment bugs split into two classes with completely different detection requirements, and a validation strategy that only handles the first is the reason these bugs ship.

Class one is immediate: the QPA platform plugin is missing and the application dies before drawing anything. Trivially detectable — the process exits non-zero at launch.

Class two is deferred: an imageformats, sqldrivers, iconengines, or tls plugin is missing. The application starts perfectly. The failure appears the first time a user opens a JPEG, connects to a database, renders an SVG icon, or makes an HTTPS request. Launching the binary in CI proves nothing about these, and this is where the real damage happens because the bug reaches production and presents as a feature quietly not working rather than as a crash.

The environment must be genuinely clean. Run validation in a container built from a base image with no Qt packages, no build tools, and no developer profile, mounting only the packaged artifact. A CI runner that built the application has the Qt installation on disk and the compiled-in paths will resolve, which makes a green result meaningless. This is the single most common flaw in Qt deployment testing.

Startup check with a headless platform plugin. Use offscreen, which requires no display server:

\`\`\`bash
QT_QPA_PLATFORM=offscreen ./MyApp --version
\`\`\`

Note the subtlety worth stating out loud: offscreen is itself a platform plugin, so this validates that the plugin tree is discoverable but does not prove qxcb or qwayland shipped. Run a second check with QT_QPA_PLATFORM=xcb under Xvfb to cover the plugin users will actually load.

Capture the diagnostic every time, not only on failure. Run one job with QT_DEBUG_PLUGINS set to 1 and archive the output as a build artifact. It prints every path searched and every load attempt with its failure reason, which turns a future production report into a two-minute comparison against a known-good log.

Exercise features, one per plugin category. This is the part teams skip. Build a small test mode into the application, or drive it with a script, that opens a JPEG and an SVG, opens the database, performs an HTTPS request, and renders an icon — then asserts on the result rather than on the absence of a crash. Each of those maps to a plugin directory, and together they cover the deferred class.

Assert on the tree itself. A cheap and surprisingly effective gate is a script that walks the packaged directory and fails if the expected plugin directories are absent or empty:

\`\`\`bash
for d in platforms imageformats iconengines tls; do
  test -n "\$(ls -A "\$PKG/plugins/\$d" 2>/dev/null)" || { echo "missing: \$d"; exit 1; }
done
\`\`\`

This catches a deployment regression at package time rather than at test time, with no runtime needed.

Check the dependency closure mechanically. Run ldd on Linux, otool -L on macOS, or a dependency walker on Windows against the packaged binary and every shipped plugin, and fail if anything resolves outside the package or outside an allowed system list. The Qt documentation warns that windeployqt may not capture all application-specific third-party libraries, and this check is what catches that.

On macOS, add codesign --verify --deep --strict and spctl --assess to the pipeline, because an unsigned nested framework passes local testing and fails on the user's machine.

Finally, gate on artifact size. A sudden jump usually means a plugin category or an entire second UI stack got pulled in accidentally; a sudden drop usually means a trim went too far. Recording the size per build and failing on a large unexplained delta catches both, and costs nothing.`,
      },
    ],
    references: [
      'https://doc.qt.io/qt-6/deployment-plugins.html',
      'https://doc.qt.io/qt-6/windows-deployment.html',
      'https://doc.qt.io/qt-6/macos-deployment.html',
      'https://doc.qt.io/qt-6/qt-conf.html',
      'https://doc.qt.io/qt-6/qt-deploy-runtime-dependencies.html',
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // 13. C++ Dependency Management
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-conan-vcpkg',
    title: 'C++ Dependency Management with Conan and vcpkg',
    icon: 'box',
    color: '#ea580c',
    questions: 5,
    description: 'Why C++ never got a canonical package manager, and how Conan 2 and vcpkg manifest mode close the gap — package IDs, triplets, baselines, lockfiles, and binary caching at scale.',
    visualizations: [
      {
        title: 'From declaration to compile line — how Conan and vcpkg deliver a dependency',
        image: '/diagrams/devops/nb-13-conan-vcpkg.png',
        description: `C++ has no canonical package manager for a structural reason, not a cultural one. In Python or Rust, a compiled artifact is portable across consumers because the language defines one ABI and one module system. In C++ the ABI is a product of compiler, compiler version, standard library, standard version, optimization and preprocessor flags, exception model, and CRT linkage. A libfoo.a built with GCC 11 libstdc++ and _GLIBCXX_USE_CXX11_ABI=1 is not interchangeable with one built by GCC 11 with the old string ABI, and neither is usable from an MSVC /MDd build. Any package manager for C++ must therefore model the build configuration as a first-class key, not just the version number.

What teams did before, and how each fails:

Vendored source, copied into third_party/. Builds always work, nothing to install. But you have forked upstream the moment you patch it, security updates require a manual re-vendor, and the vendored copy silently drifts. Two vendored copies of the same library in one link line produce ODR violations that manifest as corruption, not link errors.

Git submodules. Version is pinned by SHA, which is honest. But submodules are not a build system: you still have to make the subproject build with your flags, nested submodules explode, and a detached-HEAD submodule that nobody updated for two years is the normal end state. Recursive clone time becomes a CI cost.

System packages (apt, yum, brew). Fast and cheap on one distro. Fails the moment you need a version newer than the distro ships, need two versions at once, or need to reproduce a build from eighteen months ago. Not reproducible across a fleet of heterogeneous machines and not usable for cross-compilation.

In-house prebuilt archives on a fileshare. This is what large shops actually did, and it is the ancestor of modern binary caching. It works until nobody can answer "which compiler built this .a", at which point you get ABI mismatch crashes that reproduce only on one build agent.

Conan 2 models this explicitly. A consumer declares dependencies in conanfile.txt or conanfile.py:

\`\`\`ini
[requires]
zlib/1.3.1
fmt/10.2.1

[generators]
CMakeDeps
CMakeToolchain
\`\`\`

Profiles supply the configuration. conan profile detect --force writes a default profile capturing os, arch, compiler, compiler.version, compiler.cppstd, and build_type. conan install . --output-folder=build --build=missing resolves the graph, downloads or builds binaries, and emits conan_toolchain.cmake plus per-package find_package config files. You then configure with -DCMAKE_TOOLCHAIN_FILE=conan_toolchain.cmake and CMakeDeps makes find_package(fmt CONFIG REQUIRED) work.

The core Conan idea is the package ID. It is the SHA1 of conaninfo.txt, which contains the settings, options, and requires that affect the binary. Change build_type from Release to Debug, or compiler.version from 13 to 14, and you get a different package ID and therefore a different binary slot in the remote. Dependency versions feed the package ID too, because C++ leaks dependencies through headers, templates, and inline functions. Conan varies how much of a dependency contributes by package type: a static or header-only dependency that gets embedded into your binary defaults to full_mode (any change forces a rebuild), a shared-to-shared edge defaults to minor_mode (patch bumps are considered compatible), tool_requires normally contribute nothing, and unknown package types fall back to semver_mode.

vcpkg takes a different shape. Manifest mode puts direct dependencies in vcpkg.json next to the sources, installs into a project-local vcpkg_installed/ directory rather than a shared prefix, and integrates through one CMake variable:

\`\`\`json
{
  "name": "fibo",
  "version": "1.0.0",
  "dependencies": [ "fmt", "cxxopts", "range-v3" ],
  "builtin-baseline": "9fd3bd594f41afb8747e20f6ac9619f26f333cbe",
  "overrides": [ { "name": "fmt", "version": "10.0.0" } ]
}
\`\`\`

Configure with -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake and vcpkg installs during the CMake configure step. Configuration lives in the triplet (x64-windows, x64-linux, arm64-osx, or a custom one), not in a profile. Versions are pinned by builtin-baseline, which is a commit SHA of the vcpkg registry that establishes the version floor for every port in the graph, refined by per-dependency "version>=" and hard "overrides".

The right-hand side of the diagram is the part that pays for itself: binary caching. vcpkg computes an ABI hash over every file in the port directory, the triplet file contents and name, the C and C++ compiler executables, the selected features, the ABI hash of each dependency, the CMake version, and any variables listed in VCPKG_ENV_PASSTHROUGH. Conan computes the package ID. Both then look the artifact up in a remote before building anything. That is the whole value proposition at scale: a clean CI build of a 200-dependency graph goes from forty minutes of compiling Boost and Qt to three minutes of downloading.`,
      },
      {
        title: 'Quick-fire interview answers — C++ dependency management',
        description: `Q: Why can npm ship one artifact per version but C++ package managers cannot?
A: Because a compiled C++ artifact is only usable by a consumer with a compatible ABI, and ABI in C++ is determined by compiler, compiler version, standard library, language standard, exception model, CRT linkage, and several flags. Package managers therefore key binaries on the full build configuration — Conan calls that the package ID, vcpkg calls it the ABI hash — and fall back to building from source when there is no matching binary.

Q: What is the difference between a Conan profile and a vcpkg triplet?
A: They occupy the same slot but at different granularity. A Conan profile is a file of settings (os, arch, compiler, compiler.version, compiler.cppstd, build_type), options, tool_requires, and per-package overrides, and you can pass separate build and host profiles for cross-compilation. A vcpkg triplet is a named CMake fragment (x64-linux, x64-windows-static) that sets VCPKG_TARGET_ARCHITECTURE, VCPKG_CRT_LINKAGE, VCPKG_LIBRARY_LINKAGE and friends. Triplets are coarser; you write a custom triplet file when you need something the built-in set does not cover.

Q: How do you pin dependencies reproducibly in each tool?
A: Conan uses conan.lock. Run conan lock create . to snapshot the resolved graph including recipe revisions, then conan install . --lockfile=conan.lock in CI; a lockfile in the working directory is picked up implicitly. vcpkg uses builtin-baseline, a registry commit SHA, plus per-dependency "version>=" constraints and "overrides" for hard pins. Update baselines deliberately with vcpkg x-update-baseline, not on every build.

Q: When is CMake FetchContent the right answer instead?
A: When you have a handful of header-only or small CMake-native dependencies, want zero external tooling, and are willing to rebuild them from source on every clean build. FetchContent has no binary cache, no ABI model, no lockfile, and no way to reuse a prebuilt Qt or Boost across a fleet. It is fine for a leaf project; it does not scale to a platform with a hundred consumers.

Q: What actually makes binary caching worth the setup cost?
A: Cache hit rate multiplied by build cost. If a hundred CI jobs a day each rebuild the same forty-minute dependency closure, a shared cache converts that into one build plus ninety-nine downloads. The trap is silent cache-key instability: an environment variable that is not in VCPKG_ENV_PASSTHROUGH, a compiler upgraded on one agent, or an absolute path baked into a recipe will drop the hit rate to near zero and nobody notices because the build still succeeds.`,
      },
    ],
    introduction: `Every other mainstream language settled its packaging question a decade or more ago. C++ did not, and the reason is the ABI. A Python wheel is consumable by any CPython of the right minor version; a C++ static library is consumable only by a translation unit compiled with a compatible compiler, standard library, language standard, exception model, and set of ABI-affecting flags. There is no single binary artifact that works everywhere, so a C++ package manager has to treat build configuration as part of the package identity. Understanding that one sentence is the difference between using these tools and fighting them.

Before Conan and vcpkg became credible, teams used four strategies, all of which have a distinctive failure mode. Vendored source in third_party/ always builds and always drifts, and two vendored copies in one link line give you ODR violations that surface as memory corruption. Git submodules pin honestly by SHA but are not a build system, and the modal submodule is two years stale. System packages are fast until you need a version the distro does not carry, two versions at once, or a build reproducible eighteen months later. In-house prebuilt archives on a fileshare are the direct ancestor of binary caching and fail the same way modern caches fail when nobody records which compiler produced the artifact.

Conan 2 is the more explicit of the two. Dependencies go in conanfile.txt or conanfile.py; configuration goes in profiles; the resolved combination hashes into a package ID that names the binary slot in the remote. Generators (CMakeDeps, CMakeToolchain, and equivalents for MSBuild, Meson, Autotools) bridge into your build system. Because Conan recipes are Python, it handles awkward upstreams — custom build steps, patches, non-CMake projects — without you forking the source.

vcpkg is the more opinionated one. In manifest mode you write vcpkg.json, set CMAKE_TOOLCHAIN_FILE to scripts/buildsystems/vcpkg.cmake, and dependencies install into a project-local vcpkg_installed/ during configure. Configuration is a triplet. Versioning is a registry baseline commit plus optional per-package constraints and overrides. The workflow is shorter, the escape hatches are narrower, and the Microsoft/vcpkg registry is a curated monorepo of ports rather than a package index of independently published recipes.

Both compare against a third option that a surprising number of teams pick: CMake FetchContent. FetchContent is genuinely correct for small, CMake-native, header-heavy dependency sets. It is wrong the moment you have a build-cost problem, because it has no binary cache, no ABI model, and no lockfile — every clean build recompiles everything.

The thing an interviewer is actually probing is whether you understand that dependency management and build caching are the same problem in C++. The version resolver is table stakes. What matters at scale is the cache key: Conan package ID, vcpkg ABI hash. If you can explain what goes into that key, what silently destabilizes it, and how you would detect a hit-rate collapse, you have answered the question. If you can only recite conan install versus vcpkg install, you have not.`,
    whenToUse: [
      'A dependency closure large enough that clean builds are a measurable CI cost — Boost, Qt, Protobuf, gRPC, OpenSSL in one graph',
      'Multiple target configurations from one source tree: Debug and Release, static and shared CRT, x64 and arm64, host and cross-compiled',
      'You need reproducible builds — the ability to rebuild a release from eighteen months ago with the exact same dependency binaries',
      'You distribute a C++ library or SDK and consumers need it in configurations you do not control',
      'You are replacing vendored source or stale git submodules and need an upgrade path that does not fork upstream',
    ],
    keyConcepts: [
      {
        term: 'Package ID (Conan)',
        definition: 'The SHA1 of conaninfo.txt, which records the settings, options, and requires that affect the binary. It names the binary slot in a remote. Different build_type, compiler.version, or dependency version yields a different package ID and therefore a different binary. conan cache path shows the conaninfo.txt behind any package ID.',
      },
      {
        term: 'ABI hash (vcpkg)',
        definition: 'The vcpkg equivalent cache key. It hashes every file in the port directory, the triplet name and file contents, the C and C++ compiler executables, the selected features, each dependency ABI hash, the CMake version, and any variables named in VCPKG_ENV_PASSTHROUGH. Stored per package at share/<port>/vcpkg_abi_info.txt for inspection.',
      },
      {
        term: 'Profile (Conan)',
        definition: 'A file holding settings, options, conf, and tool_requires. conan profile detect --force writes a default. Separate build and host profiles drive cross-compilation. Profiles are the reason the same conanfile produces a Debug MSVC binary and a Release GCC binary without editing the recipe.',
      },
      {
        term: 'Triplet (vcpkg)',
        definition: 'A named configuration such as x64-windows, x64-windows-static, x64-linux, arm64-osx. Sets target architecture, CRT linkage, and library linkage. Custom triplets are ordinary CMake files; anything you add to one becomes part of the ABI hash, which is the supported way to make an environment detail cache-relevant.',
      },
      {
        term: 'builtin-baseline',
        definition: 'A vcpkg registry commit SHA in vcpkg.json that sets the version floor for every port in the graph. Without it, and without any configured registry, installs fall back to classic-mode behaviour and ignore versioning entirely. Update it with vcpkg x-update-baseline, deliberately.',
      },
      {
        term: 'conan.lock',
        definition: 'A JSON snapshot of the resolved graph including recipe revisions and timestamps, produced by conan lock create. Consumed implicitly when present, or explicitly with --lockfile. --lockfile-partial permits unlocked additions; --lockfile-clean prunes unused entries; conan lock merge combines per-configuration lockfiles.',
      },
      {
        term: 'Package ID mode',
        definition: 'How much of a dependency contributes to the consumer package ID. Embedded edges (static or header-only into your binary) default to full_mode; shared-to-shared edges default to minor_mode; tool_requires contribute nothing by default; unknown package types use semver_mode. Tunable via core.package_id:default_embed_mode and siblings in global.conf.',
      },
      {
        term: 'Generator versus toolchain file',
        definition: 'Conan splits the two: CMakeDeps writes the find_package config files, CMakeToolchain writes conan_toolchain.cmake carrying compiler, standard, and build type. vcpkg fuses them into one toolchain file that also triggers the install. Knowing which file is responsible for a missing find_package is most of Conan debugging.',
      },
    ],
    approach: [
      'Inventory the current state honestly: count vendored copies, submodules, and system-package assumptions, and record which compiler and standard library each target actually builds with',
      'Pick the tool for the constraint, not the taste — Conan when you need custom recipes, cross-compilation profiles, or to publish packages to Artifactory; vcpkg when the Microsoft registry already covers your graph and you want the shortest path',
      'Convert one leaf target first, not the whole tree: declare its direct dependencies in conanfile.txt or vcpkg.json and switch it to find_package with CONFIG REQUIRED',
      'Pin immediately — conan lock create . committed to the repo, or builtin-baseline plus overrides in vcpkg.json — before anyone gets used to floating versions',
      'Stand up the binary cache on day two, not month six: a Conan remote (Artifactory or conan_server) or VCPKG_BINARY_SOURCES pointing at NuGet, S3, or an HTTP endpoint, with readwrite from CI and read from developer machines',
      'Instrument the hit rate and alert on it, so a compiler upgrade or a leaked absolute path shows up as a cache-miss spike rather than as a slow build nobody investigates',
      'Delete the vendored copies only after the new path has produced a byte-identical or behaviourally verified build, and keep the removal as its own commit so it is trivially revertable',
    ],
    pitfalls: [
      'Treating a prebuilt binary as portable across compilers — pulling an artifact built with GCC 11 into a GCC 13 or MSVC link line produces link errors at best and silent memory corruption at worst',
      'Giving CI write access to the binary cache from an unpinned toolchain, so one agent with a different compiler patch level poisons the cache with artifacts nobody can reproduce',
      'Never setting builtin-baseline in vcpkg.json — the install silently degrades to classic-mode behaviour and ignores every versioning constraint you wrote',
      'Letting absolute paths, timestamps, or unlisted environment variables leak into recipes, which destabilizes the cache key; the build still succeeds, so the hit-rate collapse goes unnoticed for weeks',
      'Mixing a package manager with leftover system packages on the include path — find_package resolves to /usr/include and you link one version while compiling against another',
      'Using --build=missing in production CI without pinning, so a new upstream revision quietly triggers a from-source build of the entire closure on a random Tuesday',
    ],
    keyQuestions: [
      {
        question: 'Explain the Conan package ID. What goes into it, and what happens when a dependency version changes?',
        answer: `The package ID is the SHA1 hash of conaninfo.txt. That file records three things that determine whether a prebuilt binary is usable:

Settings — os, arch, compiler, compiler.version, compiler.cppstd, compiler.libcxx, build_type. These are the ABI-defining axes.
Options — per-recipe knobs, most commonly shared=True/False, plus feature toggles like with_ssl.
Requires — the dependencies, at a granularity controlled by the package ID mode.

You can verify this directly: conan cache path <ref>:<package_id> locates the package folder, and the SHA1 of its conaninfo.txt is the package ID.

The interesting part is requires, because C++ leaks dependencies through headers. If libapp statically links libfmt, then libfmt inline functions and template instantiations are physically inside libapp.a. A new libfmt is therefore not transparently substitutable, and Conan models that with per-edge modes:

- Embedded edges (static library or header-only dependency embedded into the consumer) default to full_mode. Any change to the dependency version, recipe revision, or binary changes the consumer package ID and forces a rebuild.
- Non-embedded edges (shared linking against shared) default to minor_mode. Patch bumps are treated as binary compatible; a minor or major bump forces a rebuild.
- Header-only consumers do not vary with their dependencies at all, since nothing is baked in at package time.
- tool_requires (a compiler, cmake, a code generator) have no default package_id_mode, because a build tool does not normally change the produced binary.
- Unknown package types fall back to semver_mode: for versions at or above 1.0 only major changes force a rebuild, below 1.0 any change does.

These defaults are configurable in global.conf via core.package_id:default_embed_mode, core.package_id:default_non_embed_mode, and core.package_id:default_unknown_mode.

So the answer to "what happens when a dependency version changes" is: it depends on how that dependency is linked and what package type the recipe declares. A patch bump to a shared library your shared library links against changes nothing. A patch bump to a static library you link changes your package ID and every downstream consumer package ID with it, cascading a rebuild through the graph.

The wrong answer here is "Conan rebuilds everything when anything changes." That describes the naive design, and it is exactly what package_type and the package ID modes exist to avoid. The other wrong answer is "Conan reuses binaries as long as the version matches," which is how you get an ODR violation shipped to production.`,
      },
      {
        question: 'Compare Conan 2 and vcpkg manifest mode. When would you pick each, and how do you pin versions in both?',
        answer: `Shape of the workflow:

Conan. Dependencies in conanfile.txt or conanfile.py. Configuration in a profile (conan profile detect --force). Then:

\`\`\`bash
conan install . --output-folder=build --build=missing
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
cmake --build build
\`\`\`

CMakeDeps generates the find_package config files; CMakeToolchain generates conan_toolchain.cmake carrying the settings.

vcpkg. Dependencies in vcpkg.json. Configuration in a triplet. One variable wires it up:

\`\`\`bash
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
cmake --build build
\`\`\`

The install happens during configure. Packages land in a project-local vcpkg_installed/ rather than a shared prefix, which is the main practical improvement of manifest mode over classic mode.

Pick Conan when: you need to package software that is not in a public registry and does not build with CMake, because recipes are Python and can do arbitrary work; you cross-compile and want separate build and host profiles; you already run Artifactory and want packages alongside your other artifacts; you need fine-grained control over binary compatibility via package ID modes and compatibility rules; or you are publishing packages that other teams consume with their own configurations.

Pick vcpkg when: the Microsoft/vcpkg registry already covers your graph, which for mainstream open-source C++ it usually does; you are Windows-heavy and want MSBuild and Visual Studio integration to just work; you want the shortest setup path and are content with triplets as the configuration model; or your team will not maintain recipes.

Pinning in Conan:

\`\`\`bash
conan lock create .
conan install . --lockfile=conan.lock
\`\`\`

conan.lock is JSON, records requires with recipe revisions and timestamps, and is picked up implicitly if present in the working directory. --lockfile-out=conan.lock writes an updated one, --lockfile-partial allows unlocked additions, --lockfile-clean prunes unused entries, and conan lock merge combines per-configuration lockfiles into one.

Pinning in vcpkg: builtin-baseline is a registry commit SHA that sets the version floor for the whole graph. Refine with per-dependency "version>=" and hard-pin with "overrides":

\`\`\`json
{
  "dependencies": [
    "curl",
    { "name": "zlib", "version>=": "1.2.11#9" }
  ],
  "builtin-baseline": "3426db05b996481ca31e95fff3734cf23e0f51bc",
  "overrides": [ { "name": "fmt", "version": "6.0.0" } ]
}
\`\`\`

Note vcpkg selects the lowest version satisfying all constraints, so there is no less-than constraint; and the "#9" suffix is a port-version, tracking packaging changes that did not bump the upstream version. Also note baselines are ignored when a port is consumed transitively as a dependency, which is why a library that needs a floor must declare "version>=" rather than relying on its own baseline.

The distinguishing detail an interviewer listens for: vcpkg without builtin-baseline and without a configured registry silently reverts to classic-mode resolution and ignores versioning entirely. That is a real production footgun, not a documentation trivia point.`,
      },
      {
        question: 'Your CI binary cache hit rate dropped from 95 percent to near zero overnight and nobody changed a dependency. How do you diagnose it?',
        answer: `The build still succeeds, so nothing alerts. The only symptom is duration. Start from the cache key, because a hit-rate collapse is always a key-instability problem.

For vcpkg, the ABI hash is computed over a documented input set:

- Every file in the port directory
- The triplet file contents and its name
- The C compiler executable and the C++ compiler executable
- The set of selected features
- The ABI hash of each dependency
- All helper functions referenced by portfile.cmake
- The CMake version, and the PowerShell version on Windows
- The contents of any environment variable listed in VCPKG_ENV_PASSTHROUGH
- The textual contents of VCPKG_CHAINLOAD_TOOLCHAIN_FILE

Run the install with debug output and read the abientries block. It prints each contributing item with its hash, and the triplet_abi entry itself decomposes into the triplet file hash, the platform toolchain hash, and the compiler hash. Compare that block between a known-good build and the current one; the differing line is your answer. The computed hash for an installed package is also persisted at share/<port>/vcpkg_abi_info.txt, so you can diff a cached artifact against a fresh build.

The realistic culprits, in rough order of frequency:

1. The compiler changed. The compiler executable is hashed, so a base-image bump from GCC 13.2 to 13.3, or an MSVC toolset update pulled in by a Visual Studio patch, invalidates every entry. This is by far the most common cause and it is correct behaviour — the cache is doing its job, your base image is unpinned.
2. The CMake version changed, for the same reason.
3. A build agent joined the pool with a different image, so half your jobs miss.
4. Someone edited a triplet file or added a custom triplet.
5. An environment variable in VCPKG_ENV_PASSTHROUGH changed value — a version string, a license path, a proxy setting.

For Conan the equivalent move is conan graph info . --format=json and comparing the package_id fields, or conan list "*:*" against the remote to see whether the IDs you are requesting exist there at all. The same causes apply: the profile changed, usually because compiler.version was detected rather than pinned. Profiles should be checked into the repository and passed with --profile:host, never left to conan profile detect on the agent.

The structural fix is to remove the nondeterminism rather than to widen the key. Pin the CI container image by digest, not by tag. Check the profile or triplet into version control. Put the toolchain version in the cache namespace so a compiler upgrade produces a clean new cache rather than a silent miss storm. And instrument: record cache hits and misses per job and alert on the ratio, because build duration alone is too noisy to notice a regression.

The wrong instinct is to start disabling cache-key inputs to force hits. That is how you get a binary built by one compiler linked by another, and the resulting corruption reproduces on one agent, intermittently, six weeks later.`,
      },
      {
        question: 'When is CMake FetchContent the right answer, and what does it cost you at scale?',
        answer: `FetchContent is correct for a real and common case: a small number of dependencies that are CMake-native, header-only or cheap to compile, and whose upstreams you trust to keep add_subdirectory-clean. A CLI tool depending on fmt, spdlog, and Catch2 does not need Conan.

What it actually does: downloads the source at configure time and add_subdirectory-s it into your build. That is the key property — the dependency becomes part of your build graph, compiled with your flags, in your build tree.

The advantages follow from that. There is no ABI problem, because everything is compiled together with identical flags. There is no external tool, no registry, no daemon, nothing for a new contributor to install. Cross-compilation works because the dependency inherits your toolchain file. And it composes with a package manager: FetchContent_Declare supports FIND_PACKAGE_ARGS so a system or vcpkg-provided copy is preferred when available.

The costs, in the order they hurt:

No binary cache. Every clean build compiles every dependency from source. On CI, where the workspace is clean by definition, this is the whole cost. Adding Boost or Protobuf to a FetchContent graph turns a three-minute build into a forty-minute one, and no amount of ccache tuning fully recovers it because ccache caches compilations, not the configure-and-generate work, and a fresh container has a cold ccache too.

No dependency resolution. FetchContent has no version solver. If two of your dependencies both FetchContent the same library at different tags, the first declaration wins silently — the classic diamond problem with no diagnostic.

No lockfile. GIT_TAG can be a branch name, and a distressing number of examples in the wild use main. Pinning to a full commit SHA is mandatory and unenforced. Even pinned, there is no single artifact recording the whole resolved graph.

Everything must be CMake, and well-behaved CMake. A dependency that pollutes the global namespace, sets CMAKE_CXX_FLAGS unconditionally, or defines targets without namespaces will fight your build. Autotools and Meson projects need ExternalProject_Add and a build-time step, which loses the single-graph advantage.

Your flags become their flags. Warnings-as-errors in your top-level project now applies to third-party source. Teams work around this with SYSTEM in FetchContent_Declare (CMake 3.25 and later) or per-target property surgery, but it is friction.

The senior framing: FetchContent trades build time for simplicity, and that trade is good until build time is your bottleneck. The tipping point is when a clean CI build spends more time on dependencies than on your code. At that point you are going to want a binary cache, and the tools that have one are Conan and vcpkg. Migrating later is straightforward for the well-behaved dependencies and painful for exactly the ones you should have never FetchContent-ed.`,
      },
      {
        question: 'A prebuilt dependency from your artifact store causes crashes on one platform but not others. Walk through the diagnosis.',
        answer: `The shape of this bug is almost always ABI mismatch, and the platform-specific behaviour is the clue: the same source, the same version, different binary provenance.

Step one, confirm it is not a source-level bug. Rebuild the dependency from source on the failing platform with --build=<pkg> in Conan, or by clearing that entry from the vcpkg cache. If the crash disappears, it is a binary compatibility problem and the source is fine.

Step two, identify what actually differs. The failure modes, ordered by how often they bite:

Standard library ABI. On Linux the classic is _GLIBCXX_USE_CXX11_ABI. A library built with the old std::string ABI linked into a new-ABI consumer links successfully in some configurations and corrupts strings at runtime, because the layout differs and the mangled names only sometimes collide. Check with nm -C on the dependency and grep for __cxx11 in the symbol names.

CRT linkage on Windows. Mixing /MD and /MT, or Release and Debug CRTs, gives you two heaps. An allocation in the library freed in the consumer crashes in the allocator, far from the actual bug. vcpkg encodes this in the triplet (x64-windows versus x64-windows-static); Conan encodes it in compiler.runtime. If those do not match between producer and consumer, this is your bug.

Structure layout divergence. A dependency compiled with a different -std, a different value of NDEBUG, or a different -D that guards a member field produces a different sizeof for a type crossing the boundary. This is why NDEBUG and language standard belong in the cache key.

Symbol interposition. Two versions of the same library in one process, or a vendored copy plus a package-managed copy. On Linux the dynamic linker resolves to the first definition, so you compile against headers for version A and call into version B. Check with ldd on the binary and with the LD_DEBUG=bindings environment variable to see actual resolutions.

Step three, prove it from the artifact, not from memory. In Conan, conan list and conan graph info give you the package ID that was used; conan cache path gets you to conaninfo.txt, which literally lists the settings the binary was built with. Compare them against the consumer profile field by field. In vcpkg, share/<port>/vcpkg_abi_info.txt records the hash, and debug output prints the abientries, including the compiler hash. Compare the compiler hash on the failing agent against the one that produced the cached artifact.

Step four, fix it structurally. The correct fix is never "rebuild it and hope." It is to make the differing axis part of the cache key so the mismatch is impossible rather than merely unlucky. If the axis is a setting Conan already models (compiler.runtime, compiler.libcxx, compiler.cppstd), the profile was wrong and should be checked in. If it is something the tools do not model — a vendor SDK version, a feature macro your team defines globally — vcpkg supports adding it to a custom triplet file, where it is hashed into the ABI hash; Conan supports adding it as a custom setting or option in settings.yml or the recipe.

The takeaway to state out loud: an ABI mismatch that reaches production means your cache key was under-specified. The crash is the symptom; the missing key input is the defect.`,
      },
    ],
    references: [
      'https://docs.conan.io/2/tutorial/consuming_packages/build_simple_cmake_project.html',
      'https://docs.conan.io/2/reference/binary_model/package_id.html',
      'https://docs.conan.io/2/tutorial/versioning/lockfiles.html',
      'https://learn.microsoft.com/en-us/vcpkg/consume/manifest-mode',
      'https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 14. Build Performance and Caching
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-build-performance',
    title: 'Build Performance and Caching for C++',
    icon: 'zap',
    color: '#ea580c',
    questions: 5,
    description: 'Where C++ build time actually goes and how to get it back — measurement first, then ccache and sccache, distributed compilation, include-graph reduction, and the link step that refuses to parallelize.',
    visualizations: [
      {
        title: 'Where the time goes — the C++ build pipeline and the lever at each stage',
        image: '/diagrams/devops/nb-14-build-performance.png',
        description: `Almost every C++ build-time discussion starts in the wrong place, with someone enabling unity builds because a blog post said to. The pipeline has four cost centres and each responds to a different lever, so the first move is always measurement.

Preprocessing. Every translation unit re-reads its entire include closure. A single file including <vector> and one company header can pull in three hundred files and half a million lines. Multiply by two thousand translation units and you are reading a billion lines per build. The lever is include-graph reduction, and the measurement is trivially available: -H on GCC and Clang prints the include tree, and clang -E -o /dev/null file.cpp timed against the full compile splits preprocessing from the rest.

Frontend, meaning parsing and template instantiation. This is where modern C++ actually spends its time. The same std::vector<std::string> instantiation happens independently in every translation unit that mentions it, and the linker throws away the duplicates at the end. Heavy metaprogramming, Eigen expression templates, and Boost.Spirit push this to the majority of build time. The lever is measurement via -ftime-trace (Clang 9 and later) or -ftime-report (GCC), then either reducing instantiations or accepting them and caching.

Backend codegen and optimization. Grows superlinearly with optimization level and with inlining depth. -O2 to -O3 is often a 30 percent codegen cost for a few percent runtime. LTO moves this cost to link time rather than removing it.

Link. The serial bottleneck. Traditionally single-threaded, memory-hungry, and dependent on every object file, so it cannot start until the last compile finishes. On a large binary with debug info, the linker can hold ten or more gigabytes resident.

The measurement tools, concretely:

\`\`\`bash
# Clang: per-TU JSON trace next to each object file
cmake -B build -DCMAKE_CXX_FLAGS="-ftime-trace"
ninja -C build
# aggregate across the whole build
ClangBuildAnalyzer --all build/ capture.bin
ClangBuildAnalyzer --analyze capture.bin
\`\`\`

ClangBuildAnalyzer requires Clang 9 or later with -ftime-trace and reports the slowest files to parse, the slowest to codegen, the most expensive template instantiations, the slowest functions to compile, and the most expensive headers with their inclusion chains. That last section is the one that changes behaviour: it tells you which single header, included from four hundred translation units, is costing ninety seconds.

Ninja itself is instrumented. ninja -d stats reports internal timings, ninja -t deps dumps the dependency log, and ninja -d explain tells you why a target was considered dirty — the single best tool for the "why is my incremental build rebuilding everything" question. Ninja parallelizes by CPU count by default and, unlike Make, hashes the command line into .ninja_log, so changing a compile flag correctly invalidates the outputs instead of silently reusing them.

Compilation caching. ccache 4.13 hashes in two modes. Direct mode hashes the source file, the include files, and the compiler options, and stores a manifest mapping that to a result. Preprocessor mode runs the compiler with -E and hashes the output; slower, used as a fallback. Both include the compiler name, size, and modification time. Cache-defeating patterns and their fixes:

- __DATE__, __TIME__, __TIMESTAMP__ force preprocessor mode. Fix: sloppiness = time_macros, or stop using them.
- Absolute paths in -I and in debug info make otherwise identical compilations differ. Fix: base_dir (CCACHE_BASEDIR) rewrites absolute paths under a prefix to relative before hashing, combined with -fdebug-prefix-map=$PWD=. or -fdebug-compilation-dir=. so the emitted debug info is stable too.
- The current working directory is hashed by default. Fix: hash_dir = false (CCACHE_HASHDIR) when builds happen in varying directories.
- depend_mode (CCACHE_DEPEND) skips the preprocessor entirely using compiler-generated dependency info from -MD; cheaper on a miss, lower hit rate.

sccache covers the same ground for C, C++, Rust, CUDA, and HIP, and adds first-class remote backends: S3, R2, Redis, Memcached, GCS, Azure Blob, GitHub Actions cache, and WebDAV. SCCACHE_BASEDIRS is its path-normalization knob; sccache --show-stats is its ccache -s.

Distribution. distcc ships preprocessed source to remote workers and is only correct when every worker has an identical compiler; icecream (icecc) improves on it with a scheduler and toolchain shipping. sccache offers icecream-style distributed compilation with toolchain packaging, authentication, and sandboxing. All of these distribute compilation only. Bazel and Buck2 remote execution is a different mechanism: it distributes any action in a hermetically declared graph and caches by action digest, which is stronger but requires that the build be hermetic in the first place — covered in the Bazel and Monorepo Build Systems topics.

Link. mold is the current answer on Linux. Benchmarks on a 16-core machine linking debuginfo-enabled binaries: Clang 19 takes 42.07 seconds with GNU ld, 33.13 with gold, 5.20 with lld, and 1.35 with mold. Enable it with -fuse-ld=mold on Clang and GCC 12.1 or later, -B/usr/libexec/mold on older GCC, or wrap an existing build with mold -run make. lld is the portable fallback and works on macOS and Windows too.`,
      },
      {
        title: 'Quick-fire interview answers — C++ build performance',
        description: `Q: Where does a large C++ build actually spend its time?
A: Usually template instantiation and header parsing in the compiler frontend, not codegen. Every translation unit re-parses its whole include closure and re-instantiates the same templates, then the linker discards the duplicates. Measure it with -ftime-trace plus ClangBuildAnalyzer, or -ftime-report on GCC, before touching anything.

Q: Name three things that silently defeat a ccache hit.
A: __DATE__ or __TIME__ in a header, which forces preprocessor mode and then differs every build; absolute paths, which appear in -I flags and in debug info from -g and differ per checkout directory; and the working directory itself, which ccache hashes by default. The fixes are sloppiness = time_macros, base_dir plus -fdebug-prefix-map, and hash_dir = false.

Q: Why does link time not improve when you add cores?
A: Traditional linkers are largely single-threaded and cannot start until the last object file exists, so the link is a serial tail on an otherwise parallel build. mold attacks it with heavy parallelism and is several times faster than lld; on the same 16-core benchmark Clang 19 links in 1.35 seconds with mold versus 42 seconds with GNU ld. Linkers are also the memory hogs, which is why over-sizing -j causes swap during the link phase.

Q: What is the real cost of unity builds?
A: They cut redundant header parsing, often by a large factor, but they break incremental builds — touching one source file recompiles its whole batch. They also change semantics: internal-linkage names and anonymous namespaces from different files now collide, static initialization order changes, and macros leak across file boundaries. CMake exposes UNITY_BUILD with UNITY_BUILD_BATCH_SIZE and UNITY_BUILD_UNIQUE_ID to mitigate some of that. The usual outcome is unity builds in CI, normal builds locally.

Q: How do you pick -j?
A: By memory, not by core count. Compilers use a few hundred megabytes each; linkers on a large debug binary can use ten gigabytes or more. -j equal to core count is fine for the compile phase and can swap the machine during the link phase. Use Ninja pools to cap concurrent links separately from concurrent compiles, or set -j to min(cores, RAM_GB / peak_link_GB) when links dominate.

Q: Thin LTO or full LTO?
A: Full LTO merges everything into one module and optimizes globally — best code, worst scalability, and a serial memory-bound link. ThinLTO keeps per-module summaries and parallelizes and caches the optimization step, typically getting most of the runtime benefit at a small fraction of the build cost. For anything you build more than once a day, ThinLTO.`,
      },
    ],
    introduction: `Build performance work goes wrong in a specific, predictable way: someone reads that unity builds or precompiled headers are fast, enables them globally, breaks incremental builds for the whole team, and cannot say whether the change helped because there was never a baseline. The discipline is the same as any other performance work — measure, find the dominant cost, attack that, re-measure.

The measurement is genuinely easy now. Clang 9 and later accept -ftime-trace, which writes a Chrome-tracing JSON file next to each object file breaking down frontend and backend time per source, per template instantiation, and per included header. ClangBuildAnalyzer aggregates those across a whole build and produces a report of the slowest files to parse, the most expensive template instantiations, and the headers whose inclusion costs the most in aggregate. GCC has -ftime-report, which is coarser but sufficient to distinguish frontend from backend. Ninja contributes -d stats and -d explain, the latter being the definitive answer to "why did my incremental build rebuild that."

What the measurement usually shows on a modern C++ codebase is that the frontend dominates. Every translation unit re-reads its include closure and re-instantiates the same templates; the linker deduplicates at the end. That is enormous redundant work, and it is why compilation caching pays so well: ccache and sccache turn the redundancy across builds into a hash lookup. It is also why include-graph reduction — include-what-you-use, forward declarations, the pimpl idiom for widely included types — is the highest-leverage source-level change available.

The second thing measurement shows is that the link is a serial tail. It cannot begin until the last object file lands, it is largely single-threaded in traditional linkers, and it is the phase that exhausts memory. This is why mold matters out of proportion to its scope: it is a drop-in flag that removes a bottleneck no amount of build parallelism touches.

Distribution is the third lever and the one with the most confusion around it. distcc, icecream, and sccache distributed mode all farm out compilation of individual translation units, and all of them require that the remote toolchain match the local one or that the toolchain be shipped. Bazel and Buck2 remote execution is a categorically different mechanism: it executes arbitrary actions from a hermetic graph on remote workers and caches by action digest, which subsumes both distribution and caching but requires hermeticity as a precondition. Those systems are covered in the Bazel and Monorepo Build Systems topics; the point here is not to conflate them.

The interviewer is probing for method, not tool trivia. The strong answer describes a baseline, a measurement, a hypothesis, a targeted change, and a re-measurement, and it names the tradeoff of each intervention — because every one of them has a cost. Unity builds trade incremental speed for clean-build speed. Precompiled headers trade a rebuild-the-world dependency for parse savings. LTO trades link time for runtime. Caching trades correctness risk for speed if you configure sloppiness carelessly. A candidate who presents any of these as free has not run one in production.`,
    whenToUse: [
      'Clean CI builds have grown past the point where a pull request gets feedback within the reviewer attention span',
      'Incremental local builds recompile far more than the change warrants, which is a dependency-graph problem rather than a raw speed problem',
      'Build machines swap or get OOM-killed during the link phase, which points at -j sizing rather than at the compiler',
      'A cache exists but hit rate is unknown or low, so the money spent on it is buying nothing',
      'Before adding LTO, unity builds, or precompiled headers, so there is a baseline the change can be judged against',
    ],
    keyConcepts: [
      {
        term: '-ftime-trace',
        definition: 'Clang 9 and later. Emits a Chrome-tracing JSON file per translation unit alongside the object file, breaking time into frontend, backend, per-template-instantiation, and per-header. The input ClangBuildAnalyzer consumes. GCC equivalent is the coarser -ftime-report.',
      },
      {
        term: 'ClangBuildAnalyzer',
        definition: 'Aggregates -ftime-trace output across a whole build. Workflow is --start, build, --stop, --analyze, or --all <artifacts_dir> <capture_file> followed by --analyze. Reports slowest files to parse and codegen, most expensive template instantiations, slowest functions, and most expensive headers with inclusion chains.',
      },
      {
        term: 'ccache direct mode',
        definition: 'Hashes the source, its include files, and the compiler options, storing a manifest that maps them to a cached result. Avoids running the preprocessor. Falls back to preprocessor mode (compile with -E, hash the output) when direct mode cannot be trusted, notably when time macros are present.',
      },
      {
        term: 'CCACHE_BASEDIR and hash_dir',
        definition: 'base_dir rewrites absolute paths under a given prefix to relative before hashing, so the same source in different checkout directories hits. hash_dir controls whether the current working directory is hashed; disabling it is the complementary knob. Neither fixes absolute paths already baked into debug info — that needs -fdebug-prefix-map or -fdebug-compilation-dir.',
      },
      {
        term: 'depend mode',
        definition: 'ccache depend_mode (CCACHE_DEPEND) and its sccache analogue skip the preprocessor entirely and rely on compiler-generated dependency information from -MD or /showIncludes. Cheaper on a cache miss because the preprocessor never runs twice; lower hit rate, and -MD drags system headers into the dependency set.',
      },
      {
        term: 'Unity build',
        definition: 'Concatenating several source files into one translation unit so the shared header closure is parsed once. CMake exposes it as the UNITY_BUILD target property with UNITY_BUILD_MODE (BATCH or GROUP), UNITY_BUILD_BATCH_SIZE, UNITY_BUILD_UNIQUE_ID for anonymous-namespace safety, and SKIP_UNITY_BUILD_INCLUSION to exclude a file. Destroys incremental granularity.',
      },
      {
        term: 'ThinLTO versus full LTO',
        definition: 'Full LTO merges all bitcode into one module for whole-program optimization: best code, serial and memory-bound link. ThinLTO keeps per-module summaries, performs cross-module import decisions from those summaries, and parallelizes and caches the backend, delivering most of the runtime win at a small fraction of the link cost.',
      },
      {
        term: 'Link as the serial tail',
        definition: 'The link cannot start until the last object file exists and traditional linkers are largely single-threaded, so it is unaffected by build parallelism. It is also the peak-memory phase. mold parallelizes aggressively; on a 16-core benchmark linking Clang 19 it takes 1.35 seconds against 5.20 for lld and 42.07 for GNU ld.',
      },
    ],
    approach: [
      'Establish a baseline you can defend: clean build wall time, incremental build wall time after a one-line change in a common header, and peak memory, all on the same machine class',
      'Build once with -ftime-trace and run ClangBuildAnalyzer, then read the expensive-headers section first — that is where the leverage is concentrated',
      'Run ninja -d explain on an incremental build to find over-triggering dependencies, which is usually a generated header or an overly broad glob rather than anything about compiler speed',
      'Turn on ccache or sccache and instrument the hit rate immediately (ccache -s, sccache --show-stats); fix path and time-macro instability before claiming the cache works',
      'Attack the include graph with include-what-you-use, forward declarations, and pimpl for the two or three headers the analyzer named, and re-measure after each',
      'Switch the linker to mold or lld and cap concurrent links with a Ninja pool sized against RAM rather than cores',
      'Only then consider unity builds, precompiled headers, or ThinLTO, one at a time, each with a before-and-after number and an explicit note of what it costs',
    ],
    pitfalls: [
      'Enabling unity builds globally and destroying incremental development speed to make a CI number look good, then discovering the anonymous-namespace and static-initialization-order breakage weeks later',
      'Setting CCACHE_SLOPPINESS broadly to force hit rate up, which is how you get a stale header baked into a cached object and a bug that reproduces only on machines with a warm cache',
      'Precompiled headers that include everything, so any header change invalidates the PCH and rebuilds the entire target — a net loss over having no PCH at all',
      'Setting -j to the core count on a machine that links several large debug binaries concurrently, so the build swaps or gets OOM-killed at the very end after doing all the work',
      'Deploying distcc or icecream with mismatched compilers across workers, producing objects that link but miscompile, with failures that follow the worker rather than the code',
      'Adding full LTO to a build that runs a hundred times a day for a few percent of runtime performance, converting a fast parallel link into a slow serial one',
    ],
    keyQuestions: [
      {
        question: 'Your clean build takes 45 minutes. Walk me through how you would find out where the time is going and what you would do first.',
        answer: `Before any change, three baseline numbers on a fixed machine class: clean build wall time, incremental build wall time after touching one widely included header, and peak resident memory during the build. Without the second number, any change that trades incremental for clean speed looks like a pure win.

Then split the build into its phases.

Compile versus link. Build with Ninja and read ninja -d stats, or simply watch where the parallelism collapses. If the last several minutes run at -j1, the link is your tail and no amount of compile-side work helps it.

Frontend versus backend. Rebuild with -ftime-trace and aggregate:

\`\`\`bash
cmake -B build -G Ninja -DCMAKE_CXX_FLAGS="-ftime-trace"
ninja -C build
ClangBuildAnalyzer --all build/ capture.bin
ClangBuildAnalyzer --analyze capture.bin > report.txt
\`\`\`

The report gives you slowest files to parse, slowest to codegen, most expensive template instantiations, slowest functions, and — the section that actually changes behaviour — the most expensive headers with their inclusion chains. On GCC the coarser equivalent is -ftime-report, which at least separates parsing and template instantiation from optimization passes.

Redundancy. Count how many translation units include your heaviest headers. -H prints the include tree; a script over the compile database is enough. When a single header appears in eighty percent of translation units and the analyzer says it costs ninety seconds in aggregate, you have found the work.

What I would do first depends on what the numbers say, and the ordering below is by effort-to-payoff, not by glamour:

1. Turn on ccache or sccache and verify the hit rate is actually high. This is a configuration change with no semantic risk, and on CI with a shared remote cache it is frequently the single largest win. Verify with ccache -s or sccache --show-stats; a hit rate below 80 percent on a repeated build means the cache key is unstable and that is the bug to fix, not the build.

2. Switch the linker to mold. One flag, -fuse-ld=mold, and on a large debuginfo binary it turns a 40-second link into a 1.5-second one. No semantic change.

3. Cut the include graph for the two or three headers the analyzer named. Forward declarations, pimpl for widely included types with fat implementations, and include-what-you-use to find unnecessary includes. This is real engineering effort but it compounds: it speeds up clean builds, incremental builds, IDE responsiveness, and every future build.

4. Look at incremental over-triggering with ninja -d explain. If touching one .cpp rebuilds a hundred targets, the problem is a generated header with too-broad dependencies or a CMake glob, and fixing it improves the developer loop more than any compiler flag.

What I would not do first is enable unity builds or precompiled headers. Both are real tools with real wins, but both trade incremental speed and semantic cleanliness for clean-build speed, and reaching for them before measuring is how teams end up with a fast CI and a miserable local development experience.`,
      },
      {
        question: 'Explain how ccache decides on a hit, and name the things that defeat it along with the fixes.',
        answer: `ccache operates in two modes.

Direct mode is the fast path. It hashes the source file, the include files it depends on, and the compiler options, and stores a manifest mapping that combination to a cached result. No preprocessor runs, so a hit is very cheap.

Preprocessor mode is the fallback. ccache runs the compiler with -E and hashes the preprocessed output plus the command-line options. Slower, because the preprocessor runs on every lookup, but robust against things direct mode cannot reason about.

Both modes also hash the compiler name, size, and modification time, the file extension of the preprocessed output, the current directory if hash_dir is enabled, and any extra files configured.

What defeats hits, and the fix for each:

Time macros. __DATE__, __TIME__, and __TIMESTAMP__ force a fall back to preprocessor mode, and then the preprocessed output differs on every invocation, so you never hit. Fix: remove them, or set sloppiness = time_macros and accept that a cached object may report a stale build date. Removing them is better; put the build timestamp in a single generated .cpp that is cheap to recompile.

Absolute paths. They enter through -I flags and, more insidiously, through debug info generated by -g. Two developers with the same source in /home/alice/proj and /home/bob/proj produce different hashes and different objects. Two fixes are needed together:

\`\`\`bash
export CCACHE_BASEDIR="$PWD"
# and make the emitted debug info path-independent
-fdebug-prefix-map=$PWD=.        # GCC and Clang
-fdebug-compilation-dir=.        # Clang
\`\`\`

base_dir (CCACHE_BASEDIR) rewrites absolute paths under that prefix to relative before hashing, which fixes the cache key. -fdebug-prefix-map fixes the content of the object so the cached artifact is correct for whoever pulls it. Doing only the first gives you hits on objects containing someone else's paths, which breaks debugging.

Working directory. hash_dir defaults to true, so the CWD is part of the hash. Set hash_dir = false (CCACHE_HASHDIR) when builds legitimately happen in varying directories and you have already handled debug paths.

Compiler identity. The compiler binary's size and mtime are hashed, so reinstalling the same compiler version can invalidate the whole cache. On CI this shows up as a hit-rate cliff after a base-image rebuild. compiler_check can be pointed at a version string command instead of mtime if that is a real problem for you.

Unsupported options. Some flags cause ccache to punt to the real compiler entirely. ccache -s -v shows a counter for "Unsupported compiler option" along with "Multiple source files" and "Preprocessing failed" — read this before theorizing.

Depend mode is worth knowing as a separate strategy. depend_mode (CCACHE_DEPEND) skips the preprocessor entirely and uses compiler-generated dependency information from -MD or -MMD, or /showIncludes on MSVC. Misses are cheaper because the preprocessor never runs twice, but the hit rate is lower, and -MD pulls system headers into the dependency set so a system update invalidates everything.

For distributed and CI use, ccache 4.x supports remote storage via remote_storage (CCACHE_REMOTE_STORAGE) with redis://, http://, and file:// backends, with read-only and sharding properties. sccache covers the same ground with more cloud backends — S3, R2, GCS, Azure Blob, Memcached, WebDAV — and SCCACHE_BASEDIRS as its path-normalization equivalent.

The senior point to land: sloppiness settings buy hit rate by weakening correctness guarantees. time_macros is usually acceptable. include_file_mtime and system_headers are where people get burned, because the failure is a stale object with no error message.`,
      },
      {
        question: 'Compare distcc, icecream, sccache distributed mode, and Bazel remote execution. What actually distinguishes them?',
        answer: `Two of these are the same idea and two are not.

distcc is the original. It preprocesses locally and ships the preprocessed source to a remote worker, which compiles and ships back the object file. Cheap to set up and genuinely effective on a homogeneous LAN. Its correctness precondition is severe: every worker must have a compiler that behaves identically to the local one. A worker with a different patch release produces an object that links fine and behaves subtly differently, and the resulting bug follows the worker, not the source file, which makes it maddening to reproduce. distcc also has a pump mode that ships headers so preprocessing happens remotely, which reduces local load but expands the failure surface.

icecream (icecc), originally from KDE, fixes distcc's two worst properties. It has a central scheduler that tracks worker load and assigns jobs, rather than round-robin. And it can ship the toolchain itself to workers, so heterogeneous machines become usable and the compiler-mismatch class of bug goes away. It remains a compile-distribution system: it distributes exactly one kind of action.

sccache distributed mode is icecream-style — automatic packaging of local toolchains — with the modern operational properties you would want: client authentication, transport encryption, and sandboxed execution of the compiler on the worker. It also composes with sccache's caching, so a distributed build consults the shared cache first and only farms out actual misses. That combination is the practical sweet spot for a C++-only shop that does not want to adopt a new build system.

Bazel and Buck2 remote execution is a categorically different mechanism, and conflating it with the above is the mistake an interviewer is listening for. Those systems require you to declare a hermetic action graph: every action lists its inputs, outputs, and tools explicitly, and the build system guarantees nothing else is read. Given that, each action is identified by a digest over its inputs and command, which means it can be looked up in a shared cache or dispatched to any worker in the fleet, and the result is guaranteed reusable. This subsumes both caching and distribution in one mechanism, and it applies to any action — codegen, tests, packaging, docs — not just compilation.

The tradeoffs follow directly:

- distcc, icecream, and sccache bolt onto an existing CMake, Make, or Ninja build with essentially no restructuring. They distribute compilation only, and their cache correctness rests on heuristics (ccache-style hashing) rather than on declared inputs.
- Bazel remote execution requires the build to be hermetic, which for an existing C++ codebase is months of work: no reading undeclared files, no reliance on system headers, no timestamps in outputs, pinned toolchains. In return you get correctness-by-construction caching across the whole graph, cross-language, shared between CI and every developer.

Our Bazel and Monorepo Build Systems topics go into the hermeticity model and the remote cache protocol in depth; the C++-specific point here is that hermeticity is the price of admission, and if you are not going to pay it, sccache with a shared S3 or Redis backend plus mold gets you a large fraction of the benefit for a fraction of the effort.

One practical warning about all distribution schemes: they distribute compilation, and the link stays local and serial. Once compilation is farmed out to fifty workers, the link becomes an even larger fraction of wall time. Distribution and mold are complementary, not alternatives.`,
      },
      {
        question: 'When would you use unity builds and precompiled headers, and what does each actually cost?',
        answer: `Both attack the same waste — every translation unit re-parsing the same headers — and both pay for it in different currency.

Unity builds concatenate N source files into one translation unit so the shared header closure is parsed once instead of N times. CMake exposes this properly:

\`\`\`cmake
set_target_properties(mylib PROPERTIES
  UNITY_BUILD ON
  UNITY_BUILD_MODE BATCH
  UNITY_BUILD_BATCH_SIZE 8
  UNITY_BUILD_UNIQUE_ID MY_UNITY_ID)
set_source_files_properties(weird.cpp PROPERTIES SKIP_UNITY_BUILD_INCLUSION ON)
\`\`\`

BATCH lets CMake group and honours UNITY_BUILD_BATCH_SIZE; GROUP lets you assign files to groups explicitly via the UNITY_GROUP source property and ignores batch size. The CMake documentation is explicit that projects should not set CMAKE_UNITY_BUILD to true unconditionally, because whether it helps depends on the build machine.

What unity builds cost:

Incremental granularity. Touch one file and its whole batch recompiles. With batch size 8 you have made every edit eight times more expensive. This is why the common configuration is unity builds in CI and normal builds locally, which then means two configurations to keep working.

Semantics. Names with internal linkage and anonymous namespaces from different files now share a translation unit and can collide — that is what UNITY_BUILD_UNIQUE_ID mitigates, by generating a distinct identifier per original file. Static initialization order within the merged unit changes. A macro defined in one file leaks into the next. using namespace at file scope leaks. Two files each defining a local helper with the same name now conflict. These break loudly, which is the good case; the bad case is a behaviour change from initialization order.

Bug hiding and revealing. Code that only compiles because of a unity build (relying on an include leaked from a neighbour) breaks when the batching changes. Rotating batch composition in CI catches this.

Precompiled headers serialize the parsed state of a header set once and reuse it. CMake exposes target_precompile_headers, and the reuse form matters:

\`\`\`cmake
target_precompile_headers(mylib PRIVATE <vector> <string> "common/BigThing.h")
target_precompile_headers(otherlib REUSE_FROM mylib)
\`\`\`

What PCH costs:

A rebuild-the-world dependency. Every source in the target depends on the PCH. Change any header in it and the entire target recompiles. A PCH that includes everything is therefore worse than no PCH, because the most-edited headers are exactly the ones you must keep out of it. The rule is: only headers that are both expensive and stable — standard library, third-party, generated protocol headers.

Flag rigidity. A PCH is valid only for the exact compiler and flag set that produced it. Multiple configurations mean multiple PCHs, and a flag mismatch is either an error or, worse on some toolchains, silently ignored.

Interaction with caching. Historically PCH and compile caches fought each other; ccache handles PCH with appropriate sloppiness settings but it is a place where careless configuration produces stale results, and sccache documents PCH as a limitation.

The honest recommendation: measure first with -ftime-trace. If the report says one stable third-party header dominates, a narrow PCH is the surgical fix and costs little. If it says your own frequently-edited headers dominate, the answer is to fix those headers — forward declarations, pimpl, splitting — not to precompile them. Unity builds are a blunt instrument that is defensible for CI-only clean builds and hard to justify as the default developer experience.`,
      },
      {
        question: 'How do you choose -j, and why is the link phase special?',
        answer: `The naive answer is -j equal to the number of hardware threads, and for the compile phase that is roughly right. Compilers are CPU-bound and each process uses a few hundred megabytes for typical C++, so on a 32-core machine with 64 GB you can comfortably run 32 compiles.

The link phase breaks that model in three ways.

It is serial by position. A link cannot start until every object file it consumes exists. In a project with a handful of final binaries, the build ramps down to near-zero parallelism at the end and then sits there. Adding cores does nothing for this.

It is largely serial internally. Traditional linkers — GNU ld, and gold to a lesser extent — do most of their work on one thread. lld parallelizes some phases; mold parallelizes aggressively and is the reason link time stopped being a fact of life. On the mold project's 16-core benchmark linking debuginfo-enabled binaries: Clang 19 links in 42.07 seconds with GNU ld, 33.13 with gold, 5.20 with lld, and 1.35 with mold; Chromium 124 in 27.40 with gold, 6.10 with lld, 1.52 with mold. Enable with -fuse-ld=mold on Clang or GCC 12.1 and later, -B/usr/libexec/mold on older GCC, or wrap an unmodified build with mold -run make.

It is the memory peak. A link of a large C++ binary with -g holds the entire symbol table and debug info in memory. Ten gigabytes or more for a big binary is unremarkable, and full LTO makes it far worse because the optimizer is now working on the whole program. If your build has ten such binaries and -j lets four of them link concurrently, you need forty gigabytes at exactly the moment the build looks nearly finished. The characteristic failure is a build that consumes forty minutes of CPU and then gets OOM-killed in the last two.

So the sizing rule is: compile concurrency by cores, link concurrency by memory. In Ninja, express that with a pool, which CMake can drive:

\`\`\`cmake
set_property(GLOBAL PROPERTY JOB_POOLS compile_pool=32 link_pool=2)
set(CMAKE_JOB_POOL_COMPILE compile_pool)
set(CMAKE_JOB_POOL_LINK link_pool)
\`\`\`

That lets -j stay high for compiles while capping concurrent links at what RAM supports. Without pools, the only lever is a global -j chosen for the worst phase, which wastes cores for the other 95 percent of the build.

Two further notes that separate a good answer from a complete one.

On shared CI runners, the container may see the host core count while being cgroup-limited to a fraction of it. nproc reports the host, the cgroup enforces less, and -j nproc oversubscribes badly. Read the cgroup quota, or set -j explicitly in CI config.

Debug info is the dominant term in link memory. -gsplit-dwarf (with a linker that supports it) keeps debug sections out of the linker's working set by leaving them in .dwo files, and can cut link memory and time dramatically on debug builds. It interacts with compile caching, so verify hit rate after enabling it. Reducing debug level with -g1 for CI-only builds is a cruder version of the same idea, at the cost of a less useful backtrace when something crashes — which is a trade the Native Debugging topic argues against making carelessly.`,
      },
    ],
    references: [
      'https://ccache.dev/manual/latest.html',
      'https://github.com/mozilla/sccache',
      'https://ninja-build.org/manual.html',
      'https://cmake.org/cmake/help/latest/prop_tgt/UNITY_BUILD.html',
      'https://github.com/rui314/mold',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 15. Native Debugging and Core Dumps
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-gdb-coredumps',
    title: 'Native Debugging — gdb, Core Dumps and Symbols',
    icon: 'search',
    color: '#ea580c',
    questions: 5,
    description: 'Getting an actionable backtrace out of a crash you did not witness — gdb on optimized builds, core dump capture in containers and CI, separate debug info, build-ids, and debuginfod.',
    visualizations: [
      {
        title: 'From crash to backtrace — the core dump and symbol pipeline',
        image: '/diagrams/devops/nb-15-gdb-coredumps.png',
        description: `A crash in production gives you a process that no longer exists. Turning that into a stack trace with function names, file names, and line numbers requires three things to line up: a core file that was actually written, the exact binary that produced it, and debug information matching that binary. Each of those fails independently, and each has a specific fix.

Getting a core written at all. Two gates must both pass. RLIMIT_CORE, set with ulimit -c unlimited, must be non-zero — although this is ignored when the kernel is piping the dump to a program. And /proc/sys/kernel/core_pattern must name a writable destination. The pattern supports format specifiers: %p for PID in the crashing process namespace, %P for PID in the initial namespace, %e for the executable comm value (truncated to 15 characters), %E for the full executable pathname, %t for timestamp, %h for hostname, %s for the signal number, %u and %g for real UID and GID, %i and %I for thread ID. If core_pattern begins with a pipe character, the rest is a program that receives the dump on stdin, which must be given as an absolute path and runs as root in the initial namespace — this is the mechanism systemd-coredump and apport use.

The kernel refuses to write a core in a long list of situations worth knowing: no write permission in the target directory, the directory does not exist, the filesystem is full or read-only, the binary is not readable, the process is setuid or setgid or has capabilities, RLIMIT_CORE or RLIMIT_FSIZE is zero, or core_pattern is empty with core_uses_pid at 0.

What the core contains is governed by /proc/PID/coredump_filter, a bitmask: bits 0 to 3 select anonymous and file-backed, private and shared mappings; bit 4 adds ELF headers; bits 5 and 6 cover private and shared huge pages; bits 7 and 8 cover DAX pages. The default is bits 0, 1, and 4, plus 5 where applicable. What a core never contains is the executable text of file-backed mappings — it records that libfoo.so was mapped at an address, not its contents. That is precisely why matching the core to the exact binary is mandatory, and why a core alone is not enough.

Containers make both gates fail by default. core_pattern is a host kernel setting, not a namespaced one, so a container writes according to the host's pattern. If that pattern is a relative filename, the core lands in the crashing process's working directory inside the container's filesystem and vanishes when the container is removed. The fixes are to set an absolute path on a mounted volume, or to run systemd-coredump on the host so the pipe handler captures it into /var/lib/systemd/coredump regardless of namespace. The container also needs ulimit -c raised, which for Docker means the --ulimit core=-1 flag, and needs the binary readable by whatever reads the core afterwards.

On systemd hosts, coredumpctl is the interface: coredumpctl list shows recorded dumps, coredumpctl info PID or executable name shows metadata and a signal, coredumpctl dump --output=core.file extracts the raw core, and coredumpctl debug launches gdb against it with the right binary already attached. Storage location and retention are controlled by Storage=, ProcessSizeMax=, and ExternalSizeMax= in coredump.conf.

Matching core to binary. Every modern toolchain emits a build-id — a hash placed in the .note.gnu.build-id section, enabled by -Wl,--build-id. Both the executable and its separated debug file carry the same ID, and the core records the build-ids of the mapped objects. This is what lets a debugger say "no matching build-id" rather than silently presenting a plausible-looking but wrong backtrace, which is the far more dangerous outcome and exactly what happens when you debug a core against a rebuilt binary.

Separate debug info. Production binaries should be stripped, both to reduce size and because shipping full DWARF gives away more than most companies intend. The standard split:

\`\`\`bash
objcopy --only-keep-debug myapp myapp.debug
strip -g myapp
objcopy --add-gnu-debuglink=myapp.debug myapp
\`\`\`

gdb then searches, for a binary /usr/bin/ls with debug link ls.debug and build ID abcdef1234, in this order: /usr/lib/debug/.build-id/ab/cdef1234.debug, then /usr/bin/ls.debug, then /usr/bin/.debug/ls.debug, then /usr/lib/debug/usr/bin/ls.debug. The build-id path is the one that scales, because it needs no knowledge of where the binary was installed. set debug-file-directory adds search roots.

debuginfod removes the manual step entirely. It is an HTTP server distributing ELF, DWARF, and source files, shipped with elfutils since 0.178. Set DEBUGINFOD_URLS to one or more server URLs and set debuginfod enabled on in gdb, and gdb fetches debug info, executables, and even matching source by build-id on demand. Running an internal debuginfod indexing your release artifacts is the single highest-leverage investment for making production crashes debuggable, because it eliminates the "which build was this" archaeology.

Optimized builds. At -O2 a variable may be in a register, in different registers at different points, or eliminated entirely, and gdb prints <optimized out>. Inlined frames collapse. -Og exists for this: GCC documents it as "the optimization level of choice for the standard edit-compile-debug cycle," enabling variable tracking while disabling the passes that most damage debuggability. -g is orthogonal to -O and should be on for release builds too — you strip the result into a separate file rather than compiling without debug info.

On Windows the shapes differ but the problem is identical: MiniDumpWriteDump produces a minidump, which is a subset of a full crash dump chosen for size, and reading it requires both the binaries and the matching PDB files. Symbols are matched by a GUID and age stamp rather than a build-id, and a symbol server plus _NT_SYMBOL_PATH plays the role debuginfod plays on Linux.`,
      },
      {
        title: 'Quick-fire interview answers — native debugging',
        description: `Q: Why does gdb print <optimized out> and what do you do about it?
A: At -O2 the variable may live in a register that has been reused, may exist only at some program points, or may have been eliminated because its value is derivable. The compiler emits honest DWARF saying so. Options: rebuild the specific translation unit at -Og, which GCC documents as the level of choice for the edit-compile-debug cycle; read the value out of registers using the disassembly; or reconstruct it from other live state. Do not compile production at -O0 to make debugging easier — you change the timing and often the bug.

Q: What does a core dump not contain?
A: The contents of file-backed executable mappings. The core records that libssl.so was mapped at some address, not its code. It therefore cannot be interpreted without the exact binaries that were loaded, matched by build-id. It also excludes whatever /proc/PID/coredump_filter masks off, and by default it does not include file-backed shared mappings.

Q: A core will not produce a backtrace and gdb says the build-id does not match. What happened?
A: The binary you handed gdb is not the binary that crashed. Usually someone rebuilt from the same commit, and any non-reproducible input — a timestamp, a path, a different compiler patch level — changed the output. The fix is to archive the exact stripped binary and its .debug file per release, keyed by build-id, or better, run a debuginfod server over your release artifacts so gdb fetches the right one automatically.

Q: Why strip production binaries if you need symbols to debug?
A: You keep the symbols, you just do not ship them in the binary. objcopy --only-keep-debug extracts them, strip -g removes them from the shipped artifact, and objcopy --add-gnu-debuglink links the two. The build-id in both halves lets gdb pair them later. This gives smaller deploy artifacts and less disclosure, with no loss of debuggability.

Q: How do you capture a core from a crashing container?
A: /proc/sys/kernel/core_pattern is a host setting and is not namespaced, so the container obeys the host pattern. Either point it at an absolute path on a volume mounted into the container, or use the host's systemd-coredump pipe handler, which captures regardless of namespace. Raise the limit with docker run --ulimit core=-1, and make sure the process is not running as a user that cannot write the destination.

Q: How do you make a crashing test in CI produce something actionable?
A: Enable cores in the job (ulimit -c unlimited, an absolute core_pattern under the workspace), run the test, and on failure run gdb in batch mode against the binary and core with thread apply all bt full, then upload the core, the binary, the .debug file, and the backtrace as artifacts. Without that, a crashing test gives you an exit code and a rerun.`,
      },
    ],
    introduction: `The gap this topic closes is between "the service crashed" and "here is the line that crashed and the value that caused it." That gap is where most teams lose days, because the artifacts needed to close it have to be arranged before the crash, not after.

There are three independent prerequisites. A core file has to actually get written, which depends on RLIMIT_CORE, on /proc/sys/kernel/core_pattern naming a writable destination, and on the process not being setuid — and inside a container, on the host pattern being reachable from the container's filesystem, because core_pattern is not namespaced. The exact binary that crashed has to be retrievable, because a core records that a library was mapped at an address, not the library's contents. And debug information matching that binary, by build-id, has to be findable.

Each of these has a well-established solution and each is routinely skipped. Cores are disabled by default on most distributions. Container images are built and thrown away, so the binary is gone. Production binaries are stripped without anyone archiving the .debug half. The result is the familiar situation where a production crash produces a signal number and nothing else.

The gdb side is the part most engineers already have some fluency in — breakpoints, watchpoints, bt, frame, info locals, thread apply all bt. What separates a senior answer is comfort on optimized builds. At -O2, variables read <optimized out> not because the debugger failed but because the DWARF honestly reports that the value does not exist at that point. -Og is the documented answer for the edit-compile-debug cycle, but the production reality is that you often must reason about an -O2 binary you cannot rebuild, which means reading registers, understanding that inlined frames have collapsed, and being suspicious of a backtrace that looks too clean.

Symbol management is where the leverage is. Separate debug files via objcopy --only-keep-debug plus --add-gnu-debuglink, and build-ids in .note.gnu.build-id, let you ship a small stripped binary while keeping full debuggability. debuginfod turns that from a filing problem into an HTTP GET: set DEBUGINFOD_URLS, set debuginfod enabled on, and gdb fetches debug info, the executable, and even the source by build-id. An internal debuginfod over your release artifacts is a small service that eliminates an entire category of incident-time archaeology.

The last piece is CI, and it is the one that most distinguishes a candidate. A crashing test that reports only an exit code has wasted the crash. A CI job configured to enable cores, run gdb in batch mode on failure, and upload the core, the binary, the debug file, and the backtrace as artifacts converts every flaky crash into evidence. Interviewers ask about this because it is the difference between a team that fixes intermittent crashes and one that reruns the job.`,
    whenToUse: [
      'A service crashes in production or staging and you cannot reproduce it locally, so the core file is the only evidence that will ever exist',
      'A test crashes intermittently in CI and currently produces only a signal number and an exit code',
      'You ship stripped binaries and need a symbol strategy that keeps them debuggable without shipping DWARF to customers',
      'A backtrace looks implausible — missing frames, wrong function names — and you need to determine whether the symbols actually match the binary',
      'You are moving to containers and need to re-establish core capture, which silently stops working because core_pattern is a host setting',
    ],
    keyConcepts: [
      {
        term: 'core_pattern',
        definition: '/proc/sys/kernel/core_pattern controls where cores go. Supports %p and %P for PID in the crashing and initial namespaces, %e and %E for executable name and path, %t timestamp, %h hostname, %s signal, %u and %g for UID and GID. A leading pipe character sends the dump on stdin to an absolute-path program running as root in the initial namespace, which is how systemd-coredump works.',
      },
      {
        term: 'coredump_filter',
        definition: '/proc/PID/coredump_filter is a bitmask selecting which mappings enter the core: bits 0-3 for anonymous and file-backed, private and shared; bit 4 for ELF headers; bits 5-6 for private and shared huge pages; bits 7-8 for DAX. Default is bits 0, 1, 4, and 5. Widening it makes cores enormous; narrowing it can omit the mapping you needed.',
      },
      {
        term: 'build-id',
        definition: 'A unique hash in the .note.gnu.build-id section, emitted with -Wl,--build-id, present identically in the executable and its separated debug file, and recorded in the core for every mapped object. It is what makes "no matching build-id" a loud error rather than a silently wrong backtrace, and it is the key debuginfod and /usr/lib/debug/.build-id lookups use.',
      },
      {
        term: 'Separate debug info',
        definition: 'objcopy --only-keep-debug extracts DWARF into a .debug file, strip -g removes it from the shipped binary, and objcopy --add-gnu-debuglink=<file> records the association with a CRC-32. gdb searches /usr/lib/debug/.build-id/xx/rest.debug first, then the debuglink name beside the binary, then a .debug subdirectory, then under /usr/lib/debug plus the binary path.',
      },
      {
        term: 'debuginfod',
        definition: 'An HTTP server distributing ELF, DWARF, and source files by build-id, shipped with elfutils since 0.178. Configure clients with DEBUGINFOD_URLS and enable in gdb with set debuginfod enabled on. gdb then fetches missing debug info, executables, and source on demand — the practical replacement for manually locating symbols during an incident.',
      },
      {
        term: '-Og',
        definition: 'GCC optimization level documented as "the optimization level of choice for the standard edit-compile-debug cycle," offering a blend of optimization, fast compilation, and debugging experience. Enables variable tracking and disables passes that most damage debuggability. It is not a substitute for being able to reason about an -O2 binary you cannot rebuild.',
      },
      {
        term: 'thread apply all bt',
        definition: 'The first command to run on any multithreaded core. Prints a backtrace for every thread, revealing deadlocks (two threads each blocked in a lock acquisition), the thread that actually took the signal, and threads stuck in syscalls. The full variant adds local variables per frame and is what you want in a CI artifact.',
      },
      {
        term: 'Minidump and PDB',
        definition: 'The Windows equivalents. MiniDumpWriteDump writes a size-constrained subset of process state, from a normal minidump up to MiniDumpWithFullMemory. Reading one requires both the binaries and matching PDB files; symbols match by GUID and age rather than build-id, with a symbol server and _NT_SYMBOL_PATH playing debuginfod role.',
      },
    ],
    approach: [
      'Decide the symbol policy before the first release: compile with -g and -Wl,--build-id even for release, split with objcopy --only-keep-debug, strip the shipped artifact, and archive the .debug file keyed by build-id',
      'Stand up an internal debuginfod over that archive and set DEBUGINFOD_URLS in developer and CI environments, so gdb fetches the right symbols without anyone hunting for them',
      'Enable core capture on every environment that matters: ulimit -c unlimited, an absolute core_pattern on a volume that survives the process, or systemd-coredump on the host for containers',
      'Verify it end to end with a deliberate crash — send SIGABRT to a canary process, confirm a core appears, and confirm gdb produces a symbolized backtrace from it before you need it in an incident',
      'Wire the same thing into CI: on test failure, run gdb in batch mode with thread apply all bt full and upload the core, the binary, the debug file, and the text backtrace as artifacts',
      'Practice reading an optimized backtrace — inlined frames, <optimized out> locals, tail calls — on a build you can also compile at -Og, so the -O2 reading skill is developed before it is needed',
      'Set retention deliberately: cores are large and contain memory contents including secrets, so decide storage location, access control, and expiry as part of the design',
    ],
    pitfalls: [
      'Debugging a core against a binary rebuilt from the same commit — without a matching build-id the backtrace is either rejected or, worse on some toolchains, plausible and wrong',
      'Assuming core capture works in containers because it works on the host; core_pattern is a host kernel setting and a relative pattern writes into a filesystem that disappears with the container',
      'Stripping production binaries with no archive of the corresponding .debug files, which converts every future crash into an unreadable core',
      'Building release with -O2 and no -g at all, on the theory that debug info costs runtime performance; it does not, it costs artifact size, and the fix is to split rather than to omit',
      'Storing cores without access control or expiry — a core contains process memory, which means credentials, tokens, and customer data in plaintext',
      'Treating <optimized out> as a broken debugger and reflexively rebuilding at -O0, which frequently changes timing enough that the race or the uninitialized read stops reproducing',
    ],
    keyQuestions: [
      {
        question: 'A production service segfaulted and you have a core file. Walk through getting from that to a root cause.',
        answer: `First, establish that the core and the binary belong together. This is the step people skip and it invalidates everything downstream.

\`\`\`bash
file core.12345
readelf -n ./myapp | grep -i 'build id'
gdb ./myapp core.12345
\`\`\`

gdb warns if the build-ids disagree. If they do, stop and find the right binary — the artifact from the exact release, not a rebuild. If you run an internal debuginfod, export DEBUGINFOD_URLS and gdb will fetch both the executable and the debug info by build-id automatically.

Orient before descending:

\`\`\`
(gdb) bt
(gdb) info threads
(gdb) thread apply all bt
(gdb) frame 3
(gdb) info locals
(gdb) info args
(gdb) info registers
\`\`\`

thread apply all bt is the highest-value command on any multithreaded core. It tells you which thread took the signal, whether other threads are blocked in the same lock (a deadlock signature), and whether anything is stuck in a syscall.

Read the crash frame carefully rather than trusting the first plausible story. Useful checks: is the faulting address near zero, which suggests a null dereference, or is it a wild value, which suggests use-after-free or a corrupted pointer? Is the pointer a recognizable pattern such as 0xdeadbeef or a freed-memory fill? Does the stack look self-consistent, or does bt stop abruptly, which suggests stack corruption and means the backtrace itself is untrustworthy?

Inspect the data:

\`\`\`
(gdb) p *this
(gdb) p obj->field
(gdb) x/16xg $rsp
(gdb) info frame
(gdb) p $_siginfo
\`\`\`

$_siginfo gives the signal, the fault address, and the fault code, which distinguishes a mapping error from a permission error.

Expect friction from optimization. At -O2 many locals read <optimized out>, inlined frames are collapsed into their caller (gdb shows them, but the mapping is subtle), and tail calls remove frames entirely. Three practical moves: read the values out of registers using the disassembly with disassemble /s and info registers; recover the value indirectly from another object that still holds it; or rebuild just the relevant translation unit at -Og and reproduce, accepting that timing-sensitive bugs may not survive that.

Then decide what class of bug this is, because the next step differs:

- Null dereference or obvious logic error: read the code path, write a test.
- Corruption with an implausible pointer: the crash site is a symptom, not the cause. Reproduce under AddressSanitizer or valgrind rather than staring harder at the core. The core tells you where the corruption surfaced; a sanitizer tells you where it was created.
- Deadlock or hang, where the core was taken by hand with gcore: thread apply all bt plus the lock owners is the whole answer.
- Assertion or std::terminate: the abort frame is in the runtime; walk up to the last frame in your code and read the message from the core if the runtime stored it.

Finally, close the loop operationally. If the core was hard to get or the symbols were hard to find, fix that before the next incident — that is usually the more valuable output than the individual bug.`,
      },
      {
        question: 'Explain separate debug info and build-ids. Why strip production binaries at all if you need symbols?',
        answer: `The premise "strip to save space, therefore lose debuggability" is false. Stripping moves the debug info out of the shipped artifact; it does not destroy it, provided you keep the other half.

The mechanics:

\`\`\`bash
# build with debug info even for release
g++ -O2 -g -Wl,--build-id -o myapp main.cpp

# split
objcopy --only-keep-debug myapp myapp.debug
strip -g myapp
objcopy --add-gnu-debuglink=myapp.debug myapp
\`\`\`

You now have a small myapp to deploy and a myapp.debug to archive. Two independent mechanisms let a debugger reunite them.

The debug link. --add-gnu-debuglink writes a .gnu_debuglink section containing the filename and a CRC-32 of the debug file. gdb looks for that filename beside the binary, in a .debug subdirectory beside it, and under /usr/lib/debug plus the binary's directory. The CRC guards against picking up a stale file.

The build-id. -Wl,--build-id puts a hash in .note.gnu.build-id, and the same ID appears in the separated debug file. gdb looks in /usr/lib/debug/.build-id/xx/rest.debug, where xx is the first byte in hex and rest is the remainder. Concretely, for /usr/bin/ls with debug link ls.debug and build ID abcdef1234, gdb searches /usr/lib/debug/.build-id/ab/cdef1234.debug, then /usr/bin/ls.debug, then /usr/bin/.debug/ls.debug, then /usr/lib/debug/usr/bin/ls.debug.

The build-id path is the one that scales, because it is independent of where the binary was installed, which name it was given, and which container it ran in. It is also what makes matching verifiable: the core records build-ids for mapped objects, so a mismatch is detected rather than guessed at.

Why strip at all, stated properly:

Artifact size. Full DWARF for a large C++ binary can be several times the size of the code. That is per-image layer, per-node pull, per-rollback.

Disclosure. DWARF carries type names, member names, local variable names, file paths, and often enough structure to reconstruct significant design detail. Many organizations do not want that in a customer-installed binary.

Startup and memory. Not the dominant reason, but the dynamic loader and any crash handler have less to map.

What stripping does not cost, if done this way: nothing. The .debug file and the build-id give you a complete debugging experience later.

Two mistakes to call out. First, using strip without --only-keep-debug first, which genuinely destroys the information. Second, archiving the .debug file but not the stripped binary — you need both, because the core references the mapped binary's contents, not the debug file's.

The mature endpoint is debuginfod. Rather than filing .debug files by hand, run a debuginfod server indexing your release artifacts. Developers and CI set DEBUGINFOD_URLS and gdb issues set debuginfod enabled on; from then on gdb fetches debug info, the executable, and even matching source by build-id on demand. debuginfod ships with elfutils from version 0.178 onward. For a team debugging production crashes regularly, this is the single change with the highest ratio of payoff to effort.`,
      },
      {
        question: 'How do you capture core dumps from a containerized service, and what changes versus a bare-metal host?',
        answer: `The controlling fact is that /proc/sys/kernel/core_pattern belongs to the host kernel and is not namespaced. A container does not get its own core_pattern. Whatever the host is configured to do is what happens when a process inside the container faults, and it happens with the container's mount namespace in effect for relative paths.

That produces the three failure modes people actually hit.

The pattern is a bare filename such as core. The kernel writes it relative to the crashing process's working directory, inside the container's filesystem. The container then exits and is removed, taking the core with it. This is the most common outcome and it looks exactly like "cores are not enabled."

RLIMIT_CORE is zero. Container runtimes do not inherit a raised limit from your shell. In Docker, docker run --ulimit core=-1 sets it; in Kubernetes, a securityContext cannot set it directly, so you either configure it in the container entrypoint with ulimit -c unlimited or set it at the container runtime level via the node configuration.

The pattern pipes to a handler that does not exist in the container's view. When core_pattern starts with a pipe, the kernel runs the named program as root in the initial namespace, not in the container. That is actually the good case: systemd-coredump on the host captures the dump regardless of which container produced it, and coredumpctl list shows it with the executable name and PID.

The two workable designs:

Design one, host-managed with systemd-coredump. Leave the host pattern piping to systemd-coredump, which stores into /var/lib/systemd/coredump with metadata. Retrieve with coredumpctl list, coredumpctl info, coredumpctl dump --output=core.file, and coredumpctl debug to attach gdb. Tune Storage=, ProcessSizeMax=, and ExternalSizeMax= in coredump.conf, because default limits will silently drop large cores from a multi-gigabyte service. The caveat is that you must separately obtain the binary from the image, since the core does not contain file-backed text.

Design two, absolute path onto a mounted volume. Set the host pattern to something like an absolute path under a directory you bind-mount into every container, with %e, %p, and %t in the name so cores are distinguishable. Simple and self-contained; the cost is that every container needs the mount and the directory must be writable by the container's user.

Either way, three additional requirements that are easy to forget.

The binary must be recoverable. A core is useless without the exact binary, and images get garbage collected. Either archive the binaries per release keyed by build-id, or run debuginfod over your image contents. This is the step that most often turns a successfully captured core into a dead end.

Cores are large and sensitive. A service holding a few gigabytes of heap produces a core of the same order, containing credentials, tokens, and customer data verbatim. Storage, access control, and expiry are part of the design, not an afterthought.

The process must not be setuid or capability-carrying, and the destination must exist and be writable, or the kernel silently declines. Verify the whole path with a deliberate crash before you rely on it: run a canary, send it SIGABRT, and confirm a symbolized backtrace comes out the other end.`,
      },
      {
        question: 'You are debugging an -O2 build and half the locals show <optimized out>. How do you proceed, and what does -Og change?',
        answer: `First, understand that this is not a debugger failure. At -O2 the compiler may keep a variable only in a register, move it between registers, keep it live only across part of its lexical scope, or eliminate it entirely because its value is recomputable or unused. The DWARF location lists record that honestly, and gdb reports <optimized out> because at that program counter the value genuinely does not exist anywhere.

Related effects to expect and to not misread:

Inlined frames. A function inlined into its caller still appears in the backtrace via DWARF inline records, but its frame shares the caller's stack frame. info frame looks wrong until you realize why.

Tail calls. A tail-called function replaces its caller's frame, so a frame that logically should be present is simply absent. A backtrace with a missing intermediate frame is often this, not corruption.

Reordering. Line numbers within a function are approximate; consecutive statements can be interleaved, so the reported line may not be the line that faulted in the way you expect.

Techniques that work without rebuilding:

Read the registers. disassemble /s in the crash frame shows the source interleaved with instructions. Identify which register held the value at that point and read it with info registers or p $rdi. Tedious but reliable, and it is the only option when you cannot rebuild.

Find the value elsewhere. The local may be gone but the object it came from is often still reachable from an argument, a member, or a global. p *this and walking the object graph frequently recovers what you need.

Widen the evidence. thread apply all bt full across every thread, plus x/32xg $rsp on the crash frame, often reveals the pattern (a freed-memory fill, a length that is obviously wrong) even without the specific named local.

Use the core's siginfo. p $_siginfo gives the fault address and code, distinguishing "address not mapped" from "permission denied", which narrows the hypothesis space immediately.

What -Og changes. GCC documents -Og as intended to "Optimize while keeping in mind debugging experience" and as "the optimization level of choice for the standard edit-compile-debug cycle, offering a reasonable blend of optimization, fast compilation and debugging experience especially for code with a high abstraction penalty." Concretely it enables -fvar-tracking and -fvar-tracking-assignments so variable locations are tracked properly, and it disables passes that most damage debuggability such as -fdse, -fif-conversion, -fbranch-count-reg, and -fdelayed-branch. The practical result is that locals are readable, the line table tracks statements closely, and yet the abstraction-heavy C++ idioms (small accessors, iterators, smart pointer indirections) still get inlined enough that the code runs at a usable speed. That last part is why -Og is much better than -O0 for C++ specifically.

The important professional caveat: rebuilding at -Og or -O0 to make debugging pleasant changes timing and inlining, and a large class of the bugs worth debugging — data races, uninitialized reads whose value happened to come from a reused register, ABA problems — stop reproducing when you do that. So the correct posture is: keep -g on release builds so an -O2 core is readable at all, develop the skill of reading optimized frames, and reach for -Og only when you can still reproduce the failure with it. If the bug disappears at -Og, that itself is information — it points at undefined behaviour or a race, and the next tool is a sanitizer, not the debugger.`,
      },
      {
        question: 'How do you make a crashing test in CI produce an actionable backtrace instead of an exit code?',
        answer: `The default CI experience for a native crash is a signal number and a rerun. Fixing it is mostly configuration, and it pays for itself the first time an intermittent crash appears.

Enable capture in the job. Cores are off by default in almost every runner image, and the pattern is usually not what you want.

\`\`\`bash
ulimit -c unlimited
# absolute path so it survives the process CWD, with identifying fields
sudo sysctl -w kernel.core_pattern="$PWD/cores/core.%e.%p.%t"
mkdir -p "$PWD/cores"
\`\`\`

%e is the executable comm value, %p the PID, %t the timestamp. If the runner is itself a container without privileged sysctl, you have two options: configure the pattern on the host that runs the runners, or use the host's systemd-coredump and extract with coredumpctl afterwards.

Build so the core is readable. Compile release-like builds with -g and -Wl,--build-id even when optimizing, and keep the unstripped binary or the split .debug file as a job artifact. A core produced from a binary you cannot reproduce is a dead end, and CI is exactly where binaries get rebuilt casually.

Symbolize on failure, in the job, while the artifacts exist:

\`\`\`bash
run_tests || {
  for core in cores/core.*; do
    gdb -batch -q \\
        -ex "set pagination off" \\
        -ex "thread apply all bt full" \\
        -ex "info registers" \\
        -ex "info sharedlibrary" \\
        ./build/mytest "$core" | tee "$core.txt"
  done
  exit 1
}
\`\`\`

-batch with -ex commands is the whole trick; no interactivity required. thread apply all bt full is the payload — every thread, every frame, every local. info sharedlibrary tells you which libraries were loaded and whether their symbols resolved, which is how you notice a symbol mismatch rather than misreading a garbage backtrace.

Upload everything. The core, the binary, the .debug file, and the text backtrace. The text backtrace is what a reviewer reads; the core plus binary is what someone needs when the text is not enough. Cores are large, so gzip them and set a short retention.

Make symbols findable rather than attached. If you run an internal debuginfod, set DEBUGINFOD_URLS in the CI environment and gdb resolves symbols for system libraries as well as your own, which is often what turns a backtrace that stops at a libc frame into a complete one.

Two complements worth mentioning because they cover cases cores do not.

An in-process signal handler that writes a backtrace on SIGSEGV and SIGABRT gives you something even when core capture fails entirely. It is unsafe in the strict async-signal-safety sense and can itself crash, so it supplements rather than replaces cores, but a partial backtrace beats an exit code. Google's abseil failure signal handler and libbacktrace are the usual implementations.

Sanitizers catch a different and larger class. AddressSanitizer and UndefinedBehaviorSanitizer report at the moment of the error rather than at the eventual crash, with a full allocation and free stack for use-after-free. A CI matrix that runs the suite once optimized and once under sanitizers finds bugs the core never would, because many memory errors do not crash. Set ASAN_OPTIONS with abort_on_error=1 so the sanitizer failure also produces a core if you want both.

The framing to state: a crash in CI is the cheapest reproduction you will ever get, because it already happened on a machine you control. Configuring the job to preserve the evidence is a one-time cost against an unbounded number of future incidents.`,
      },
    ],
    references: [
      'https://sourceware.org/gdb/current/onlinedocs/gdb.html/Separate-Debug-Files.html',
      'https://sourceware.org/gdb/current/onlinedocs/gdb.html/Debuginfod.html',
      'https://www.man7.org/linux/man-pages/man5/core.5.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html',
      'https://learn.microsoft.com/en-us/windows/win32/debug/minidump-files',
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // 16. Sanitizers and Memory Debugging
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-sanitizers',
    title: 'Sanitizers and Memory Debugging',
    icon: 'shield',
    color: '#ea580c',
    questions: 5,
    description: 'AddressSanitizer, UBSan, ThreadSanitizer and MemorySanitizer — what each instruments, what it costs, and where each belongs in a CI pipeline. Includes Valgrind memcheck as the no-rebuild fallback and how to read a sanitizer report.',
    visualizations: [
      {
        title: 'Shadow memory, redzones, and the sanitizer cost matrix',
        image: '/diagrams/devops/nb-16-sanitizers.png',
        description: `A sanitizer is a compiler instrumentation pass plus a runtime library. The compiler rewrites every memory access in your translation unit to consult a side table before it happens; the runtime library owns that side table, intercepts the allocator, and prints the report. Nothing about this is a debugger attaching after the fact — the checking is compiled into the binary, which is why you rebuild to change sanitizers and why an uninstrumented third-party .a is a hole in your coverage.

How AddressSanitizer works:

ASan divides the address space into application memory and shadow memory. Every aligned 8-byte granule of application memory maps to exactly one shadow byte at address (addr >> 3) + offset, where the offset on x86_64 Linux is 0x7fff8000. That one byte encodes how much of the granule is addressable: 0 means all 8 bytes are valid, a value 1 through 7 means only the first N bytes are valid (a partially addressable tail), and a negative value is a poison code naming why the memory is off limits. The codes you actually see in reports are fa (heap left redzone), fd (freed heap region), f1/f2/f3 (stack left, mid, right redzone), f5 (stack use-after-return), f8 (stack use-after-scope) and f9 (global redzone).

Around every heap allocation ASan places redzones — poisoned bytes on both sides. A one-past-the-end write lands in a redzone, the shadow byte is nonzero, the check fails, and you get a report at the instant of the overflow rather than a corrupted heap that crashes ten minutes later somewhere unrelated. Freed memory is not returned to the allocator immediately; it goes into a quarantine with its shadow set to fd, which is how use-after-free is caught instead of silently succeeding on reused memory. Stack frames get poisoned redzones between locals, and globals get a poisoned tail after each object.

That design explains the cost. The documented slowdown is about 2x, and memory overhead is roughly 3x resident set — one shadow byte per eight application bytes is only 1/8, but the quarantine, the redzones, and the per-allocation metadata dominate. ASan also reserves a very large region of virtual address space for the shadow mapping, which is why a build script that sets ulimit -v makes ASan die at startup with a shadow memory mapping error.

The other three sanitizers, and what each buys:

UndefinedBehaviorSanitizer is a family of independent checks rather than one mechanism: signed integer overflow, shift out of bounds, division by zero, null and misaligned pointer use, array bounds, invalid enum and bool loads, float cast overflow, reaching an unreachable, calling through a mismatched function pointer type, and vptr checks for bad downcasts. Cost is small and there is no address space or ABI impact, which is why UBSan is the one sanitizer people sometimes ship. Note that -fsanitize=undefined deliberately omits float-divide-by-zero, unsigned-integer-overflow, implicit-conversion, local-bounds, vptr and the nullability checks — you opt into those separately.

ThreadSanitizer detects data races using vector clocks and a shadow word per memory location holding recent access history. Documented cost is 5x to 15x slower and 5x to 10x more memory. It requires all code compiled with -fsanitize=thread; an uninstrumented library that takes a lock is invisible to TSan and produces false race reports on data that is actually protected. It is 64-bit only, needs PIE, and cannot be combined with ASan or MSan because all three claim the same shadow mappings and interceptors.

MemorySanitizer finds reads of uninitialized memory. It is the strictest and the hardest to deploy, because it needs every line of code instrumented including the C++ standard library — in practice you build libc++ with MSan. Cost is roughly 3x, and -fsanitize-memory-track-origins=2 adds another 1.5x to 2x on top while telling you where the uninitialized value was born, which is the difference between an actionable report and a mystery.

Valgrind memcheck is the alternative that needs no rebuild at all. It runs the binary under dynamic binary translation, so it works on a stripped vendor library or a production binary you cannot recompile, and it finds uninitialized value use without an instrumented libc. The price is 10x to 30x slowdown, another 2x on top with --track-origins=yes, and a structural blind spot: memcheck sees only heap allocations, so stack buffer overflows and global overflows that ASan catches trivially are invisible to it.`,
      },
      {
        title: 'Quick-fire interview answers — sanitizers',
        description: `Q: Why can you not run ASan and TSan in the same binary?
A: Both need to own the whole address space layout and both install allocator and libc interceptors. Their shadow mappings collide, so clang rejects -fsanitize=address,thread outright as an invalid combination. The practical answer is that they are separate build configurations and separate CI jobs — you never get one binary that is both.

Q: What can you combine?
A: UBSan composes with everything: -fsanitize=address,undefined and -fsanitize=thread,undefined are both valid and are what you actually build. ASan, TSan and MSan are mutually exclusive with each other. LeakSanitizer is bundled into ASan on Linux and also exists standalone as -fsanitize=leak for when you want leak detection without the 2x ASan overhead.

Q: Why does a UBSan finding not fail the build by default?
A: Because UBSan is recoverable by default — it prints a diagnostic and keeps running, and the process exits zero. CI stays green while the report scrolls past in the log. You need -fno-sanitize-recover=all at compile time, or UBSAN_OPTIONS=halt_on_error=1, plus UBSAN_OPTIONS=print_stacktrace=1 to get a symbolized frame list instead of a bare source location.

Q: Your ASan report shows hex addresses instead of function names. What is wrong?
A: The runtime cannot find llvm-symbolizer. Put it on PATH or set ASAN_SYMBOLIZER_PATH to the binary. Also confirm you compiled with -g and -fno-omit-frame-pointer; without frame pointers the unwinder produces truncated or wrong stacks. If you deliberately want raw output for offline processing, ASAN_OPTIONS=symbolize=0 and symbolize later.

Q: Where do you run each sanitizer in a pipeline?
A: ASan plus UBSan on every pull request — 2x on a unit test suite is affordable and it catches the highest-value bug classes. TSan nightly as a separate build because it is 5x-15x and needs the whole dependency tree instrumented. MSan only if you already build your own libc++. Valgrind on demand, for third-party binaries you cannot rebuild or for a bug ASan cannot see.

Q: What does the quarantine do and why does it matter for long-running tests?
A: Freed heap blocks are held poisoned rather than reused, so a later access is reported as use-after-free instead of silently hitting recycled memory. The consequence is that a long soak test under ASan grows RSS steadily. ASAN_OPTIONS=quarantine_size_mb bounds it, at the cost of missing use-after-free on blocks that aged out.`,
      },
    ],
    introduction: `Memory bugs in C and C++ are the class of defect that survives code review and unit tests and then shows up as a crash in production with a stack that points nowhere near the actual fault. A heap buffer overflow corrupts an adjacent allocation; the program continues, and the failure surfaces later in unrelated code. A use-after-free reads memory that was recycled into a different object; the values look plausible until they do not. Sanitizers exist to convert these delayed, misattributed failures into immediate, precise reports at the exact instruction that did the wrong thing.

The mechanism is compiler instrumentation, not runtime attachment. Passing -fsanitize=address makes clang or gcc rewrite loads and stores to check a shadow table first, and links a runtime library that owns the allocator and the reporting. This has two consequences people miss in interviews. First, coverage is per translation unit: a prebuilt vendor .a is not instrumented, so bugs inside it are invisible and bugs in your code that only manifest through it may be reported at the wrong boundary. Second, changing sanitizers means a full rebuild with a separate build directory, which is why sanitizer CI is a matrix of build configurations rather than a flag you flip on an existing artifact.

Four sanitizers matter. AddressSanitizer catches spatial and temporal memory errors — heap, stack and global overflow, use-after-free, use-after-return, use-after-scope, double free, invalid free — and bundles LeakSanitizer for leaks at exit, for about 2x time and 3x memory. UndefinedBehaviorSanitizer is a set of cheap independent checks for the undefined behavior the optimizer is allowed to exploit. ThreadSanitizer finds data races that no amount of stress testing reliably reproduces, at 5x to 15x. MemorySanitizer finds reads of uninitialized memory, and demands that the entire program including the standard library be instrumented.

Valgrind memcheck sits outside this family. It needs no rebuild, which makes it the tool of last resort for a binary you did not compile, and it is the only one on this list you can point at a production artifact. It is also 10x to 30x slower and structurally cannot see stack or global overflows, because it only knows about the heap.

The judgment an interviewer is testing is placement, not knowledge of flags. Sanitizers only find bugs on code paths your tests actually execute, so a sanitizer build with a weak test suite finds nothing. ASan plus UBSan belongs on every pull request because the cost is tolerable and the yield is high. TSan belongs on a nightly job because it is expensive and because it needs the whole dependency graph rebuilt. Coverage-guided fuzzing under ASan is where the two multiply: the fuzzer generates the inputs, the sanitizer turns silent corruption into a crash the fuzzer can record.

The second thing an interviewer probes is whether you have actually read a report. Anyone can enable a flag. Knowing that fd in the shadow byte dump means freed heap region, that the second stack in the report is the free site and the third is the allocation site, and that a report about a 20-byte region with an access 8 bytes inside it is a use-after-free rather than an overflow, is what separates someone who ran a sanitizer once from someone who debugs with one.`,
    whenToUse: [
      'Every pull request: a dedicated -fsanitize=address,undefined build running the unit test suite, with -fno-sanitize-recover=all so UBSan findings actually fail the job',
      'Nightly or pre-release: a separate -fsanitize=thread build for data races, since TSan cannot share a binary with ASan and costs 5x-15x',
      'Fuzzing: libFuzzer or AFL++ targets always built with ASan and UBSan, because a fuzzer without a sanitizer only finds inputs that already crash',
      'Debugging a specific crash: MSan with -fsanitize-memory-track-origins=2 when the symptom is nondeterministic behavior that smells like an uninitialized read',
      'Third-party or release binaries you cannot rebuild: Valgrind memcheck with --leak-check=full --track-origins=yes',
    ],
    keyConcepts: [
      {
        term: 'Shadow memory',
        definition: 'A parallel region where every aligned 8-byte granule of application memory maps to one byte at (addr >> 3) + offset. The byte records how many of the eight bytes are addressable, or a poison code naming why they are not. Every instrumented load and store consults it before executing.',
      },
      {
        term: 'Redzone',
        definition: 'Poisoned padding that ASan inserts around heap allocations, between stack locals, and after globals. An off-by-one access lands in a redzone and is reported immediately, instead of silently corrupting the neighbouring object and crashing somewhere unrelated later.',
      },
      {
        term: 'Quarantine',
        definition: 'Freed heap blocks are withheld from reuse and left poisoned so a subsequent access reports heap-use-after-free rather than succeeding on recycled memory. Bounded by ASAN_OPTIONS=quarantine_size_mb; a smaller quarantine saves RSS in long soak tests but lets old use-after-free bugs slip through.',
      },
      {
        term: 'Recoverable vs non-recoverable check',
        definition: 'UBSan checks are recoverable by default: they print and continue, and the process exits zero. -fno-sanitize-recover=all makes them abort, and -fsanitize-trap= replaces the runtime call with a trap instruction entirely. Without one of these, UBSan findings never fail CI.',
      },
      {
        term: 'Instrumentation completeness',
        definition: 'ASan tolerates uninstrumented code with reduced coverage. TSan does not — it requires all code compiled with -fsanitize=thread, because a lock taken in an uninstrumented library is invisible and produces false race reports. MSan is stricter still and needs an instrumented libc++.',
      },
      {
        term: 'Suppressions vs ignorelist',
        definition: 'Two different mechanisms. A suppressions file is runtime (ASAN_OPTIONS=suppressions=, LSAN_OPTIONS=suppressions= with leak: entries, TSAN_OPTIONS with race:/thread:/called_from_lib: entries) and silences reports. A sanitizer special case list is compile time and skips instrumenting the named src, fun, global or type in the first place.',
      },
      {
        term: 'LeakSanitizer',
        definition: 'A leak detector that runs at process exit under ASan on Linux, and also exists standalone as -fsanitize=leak without the 2x ASan overhead. Controlled by ASAN_OPTIONS=detect_leaks; default behaviour varies by platform, so verify rather than assume it is on.',
      },
      {
        term: 'Origin tracking',
        definition: 'MSan option -fsanitize-memory-track-origins=2 that records where an uninitialized value was created, not just where it was consumed. Adds 1.5x-2x on top of MSan baseline and is the difference between a report you can act on and one you cannot.',
      },
    ],
    approach: [
      'Create a separate build directory per sanitizer configuration — build/asan, build/tsan — because switching -fsanitize requires a full rebuild and mixing object files silently breaks the runtime',
      'Compile with -fsanitize=address,undefined -fno-omit-frame-pointer -fno-optimize-sibling-calls -g -O1, and link with the clang or gcc driver rather than ld so the runtime library is pulled in',
      'Set -fno-sanitize-recover=all so UBSan aborts instead of printing and returning zero, and confirm the job actually goes red by injecting a deliberate signed overflow once',
      'Put llvm-symbolizer on PATH (or set ASAN_SYMBOLIZER_PATH) and verify the first report shows file:line, not hex addresses, before you trust any subsequent report',
      'Run the full test suite under the sanitizer build, not a smoke subset — sanitizers only see code paths your tests execute, so coverage of the test suite is the ceiling on what they can find',
      'Triage the initial wave: fix everything in your own code, and record findings in third-party dependencies in a checked-in suppressions file with a comment naming the upstream issue, never a blanket wildcard',
      'Add a second nightly job with -fsanitize=thread,undefined once the ASan job is stable, and treat its first run as a backlog to burn down rather than a gate',
    ],
    pitfalls: [
      'Leaving UBSan recoverable — the checks fire, the diagnostics are in the log, the process exits zero, and CI has been green for months while reporting real undefined behavior on every run',
      'Trying to combine -fsanitize=address with -fsanitize=thread, or assuming a single sanitizer build covers everything; they are mutually exclusive and need separate jobs and separate build trees',
      'Running TSan against a partially instrumented binary — an uninstrumented library that takes a mutex is invisible to the happens-before tracking, so TSan reports races on data that is correctly protected and the team stops believing the tool',
      'A build wrapper that sets ulimit -v, which makes ASan fail at startup because it cannot reserve its shadow mapping; the error mentions shadow memory range and looks like an ASan bug rather than a build script problem',
      'Suppressing a report with a broad wildcard because the stack passed through a third-party header, which silences the entire subsystem including your own future bugs; suppressions must be narrow and dated',
      'Enabling sanitizers on a soak test without bounding the quarantine, then blaming the sanitizer when RSS climbs for six hours and the box OOMs — the quarantine is doing exactly what it was designed to do',
    ],
    keyQuestions: [
      {
        question: 'Walk me through this AddressSanitizer report line by line. What is the bug, and what do the shadow bytes tell you?',
        answer: `Take a representative report:

  ==31447==ERROR: AddressSanitizer: heap-use-after-free on address 0x60300000eff8
      at pc 0x0000004a1b2c bp 0x7ffd4e9a1230 sp 0x7ffd4e9a1228
  READ of size 4 at 0x60300000eff8 thread T0
      #0 0x4a1b2b in process(Buffer*) src/buffer.cc:91:12
      #1 0x4a1f0d in main src/main.cc:24:5

  0x60300000eff8 is located 8 bytes inside of 20-byte region
      [0x60300000eff0,0x60300000f004)
  freed by thread T0 here:
      #0 0x498e2d in operator delete(void*)
      #1 0x4a1a9f in Buffer::reset() src/buffer.cc:57:3

  previously allocated by thread T0 here:
      #0 0x49859d in operator new(unsigned long)
      #1 0x4a1a8f in Buffer::Buffer(unsigned long) src/buffer.cc:41:20

  SUMMARY: AddressSanitizer: heap-use-after-free src/buffer.cc:91:12 in process

Reading it in order:

Line one names the bug class and the faulting address. heap-use-after-free, not heap-buffer-overflow — that distinction is decided by the shadow byte, not by the address arithmetic. Line two says READ of size 4, so this was a load of an int or a float, not a write, and thread T0 means the main thread.

The first stack is the access site: buffer.cc:91, column 12, inside process(). That is where the bug fires, which is not necessarily where the bug is.

The location line is the one people skip and it is the most informative. The address is 8 bytes inside a 20-byte region, and the region bounds are printed. Inside means this is not an overflow — the pointer is legitimately within the original allocation. Combined with the bug class, the object was freed while a live pointer to it still existed.

The second stack is the free site: Buffer::reset() at buffer.cc:57. The third is the allocation site: the constructor at buffer.cc:41. Three stacks is the signature of a temporal bug. A pure spatial bug — heap-buffer-overflow — prints only the access stack and the allocation stack, and the location line reads "N bytes to the right of a 20-byte region" instead of "inside of".

So the diagnosis without opening an editor: Buffer::reset() releases the storage but something retained a raw pointer to it, and process() dereferences that pointer four bytes into the dead object. The fix is an ownership question, not a bounds check.

The shadow dump at the bottom completes the picture. Each printed byte covers eight application bytes, the faulting granule is bracketed, and the legend is emitted with every report. The codes that carry meaning:

  00        all eight bytes addressable
  01..07    only the first N bytes addressable, the rest is a partial redzone
  fa        heap left redzone
  fd        freed heap region
  f1 f2 f3  stack left, mid, right redzone
  f5        stack use-after-return
  f8        stack use-after-scope
  f9        global redzone

A bracketed fd confirms freed heap. A bracketed fa or the right-side heap redzone code means you overran an allocation. A bracketed f9 means you walked off the end of a global. Reading the shadow byte is how you cross-check the headline when the report is confusing — for example a stack-buffer-overflow that reports f5 is really a use-after-return, meaning someone returned a pointer to a local.

One caveat worth saying out loud: the frames are only trustworthy if the binary was built with -g and -fno-omit-frame-pointer. Bare hex addresses mean llvm-symbolizer was not found, not that the report is broken.`,
      },
      {
        question: 'Why can ASan and TSan not be combined, and how does that shape your CI matrix?',
        answer: `They cannot coexist because both are whole-address-space designs that claim the same resources.

Both reserve large fixed shadow mappings and compute shadow addresses with a hardcoded scale and offset. ASan maps eight application bytes to one shadow byte; TSan keeps a multi-word shadow cell of recent access history per memory location and reserves a very different, much larger layout. There is no address space arrangement that satisfies both.

Both replace the allocator and install interceptors over the same libc surface — malloc, free, memcpy, pthread primitives, longjmp. Only one runtime can own those symbols in a process.

Their instrumentation passes rewrite the same loads and stores with different, non-composable checks. Clang does not attempt to merge them; -fsanitize=address,thread is rejected at the driver as an invalid argument combination. MSan is excluded from both for the same reasons.

UBSan is the exception and it is worth knowing why: UBSan is not a shadow-memory design. It inserts local checks around specific operations and calls a small runtime on failure. It has no address space claim and no allocator interception, which is why -fsanitize=address,undefined and -fsanitize=thread,undefined are both valid, and why UBSan is the one that can even be shipped in production with -fsanitize-minimal-runtime.

The CI consequence is a matrix, not a flag:

  build/asan   -fsanitize=address,undefined -fno-sanitize-recover=all
               runs on every pull request, full unit suite, roughly 2x wall clock

  build/tsan   -fsanitize=thread,undefined
               runs nightly, concurrency-relevant tests, 5x-15x wall clock

  build/msan   -fsanitize=memory -fsanitize-memory-track-origins=2
               only if you build an instrumented libc++; otherwise skip it

Three practical points that separate a real answer from a memorized one.

First, these are separate build directories. Sanitizer choice changes the ABI of the instrumented objects, so a shared build tree with a changed -fsanitize flag either fully rebuilds or produces a binary that crashes in the runtime for reasons that look nothing like the actual cause. Configure each once and keep them.

Second, TSan requires all code instrumented, which means your dependencies too. If you consume prebuilt libraries, the TSan job needs its own dependency build. Teams that skip this get false races on data protected by a lock inside the uninstrumented library, conclude TSan is noisy, and turn it off. That is the single most common way TSan dies in an organization.

Third, ASan on every PR and TSan nightly is a cost decision, not a correctness one. If your product is a concurrency-heavy service, moving TSan onto the PR path for a targeted subset of tests is defensible. The wrong answer is claiming one sanitizer build covers everything.`,
      },
      {
        question: 'Your ASan and UBSan job has been green for six months, but a customer just hit a signed overflow bug in code that job exercises. What went wrong?',
        answer: `The most likely cause is that UBSan was recoverable. This is the single most common sanitizer misconfiguration in the wild.

UBSan checks default to recover: on a violation the runtime prints a diagnostic to stderr and execution continues, and the process ultimately exits with whatever status it would have had. The test passes. CTest sees exit code zero. The pipeline goes green. Meanwhile the log contains lines like:

  src/rate.cc:88:17: runtime error: signed integer overflow:
      2147483647 + 1 cannot be represented in type 'int'

nobody reads, because nobody reads passing job logs.

The fix is one of:

  -fno-sanitize-recover=all          compile time, abort on any UBSan finding
  -fsanitize-trap=<checks>           compile time, emit a trap, no runtime call
  UBSAN_OPTIONS=halt_on_error=1      runtime, same effect for the run

Add UBSAN_OPTIONS=print_stacktrace=1 as well, otherwise you get a source location with no calling context, and build with -g -fno-omit-frame-pointer so the stack is real. Verify by deliberately introducing an overflow and confirming the job goes red — an unverified gate is not a gate.

Three other explanations worth ruling out, because a good interviewer will push:

The code path was not covered. Sanitizers are dynamic analysis. They observe only what runs. If the overflow needs a specific input the test suite never supplies, no sanitizer configuration finds it. The answer here is fuzzing the same entry point under ASan and UBSan, which is exactly the combination libFuzzer and AFL++ are built around, plus checking coverage of the sanitizer job specifically rather than of the ordinary build.

The check was not in the enabled set. -fsanitize=undefined does not enable everything. It deliberately excludes float-divide-by-zero, unsigned-integer-overflow, implicit-conversion, local-bounds, vptr and the nullability checks. Unsigned overflow is well-defined in C++ so its exclusion is correct by default, but a codebase that treats unsigned wraparound as a bug needs -fsanitize=unsigned-integer-overflow explicitly, and implicit-conversion catches an entire class of narrowing bugs that -Wconversion also flags.

The overflowing translation unit was not instrumented. If the arithmetic lives in a prebuilt third-party library, or in a file excluded by a sanitizer special case list that someone added years ago to quiet a false positive, the check was never compiled in. Grep for the ignorelist and for no_sanitize attributes as part of the investigation.

Ordered by likelihood: recoverable UBSan first, missing coverage second, check not in the default group third, uninstrumented TU fourth. The postmortem action is not just fixing the overflow — it is making the job fail on the next one, and proving it does.`,
      },
      {
        question: 'When would you use Valgrind memcheck instead of a sanitizer, and what does it cost you?',
        answer: `Memcheck is the right tool in exactly the situations where instrumentation is not available to you.

Where memcheck wins:

You cannot rebuild the binary. A vendor ships a stripped shared object, or you are handed a release artifact from a customer environment and asked what it is doing. Memcheck runs under dynamic binary translation — it rewrites machine code as it executes — so it needs no source, no flags, and no cooperation from the build. That is a capability ASan structurally cannot offer.

You want uninitialized-value detection without an instrumented world. MSan is the sanitizer for that bug class, and MSan requires every dependency including libc++ to be instrumented, which is a project in itself. Memcheck gives you the same class of finding out of the box with --track-origins=yes telling you where the undefined value came from.

You need leak detail beyond a binary answer. Memcheck classifies leaks four ways — definitely lost (no pointer to the block anywhere), indirectly lost (only reachable via a definitely-lost block, so it disappears when you fix the parent), possibly lost (only an interior pointer was found, a common false positive with custom allocators and tagged pointers) and still reachable (a live pointer exists at exit, usually a singleton, usually benign). LeakSanitizer's output is flatter. That taxonomy is what stops a team from chasing still-reachable singletons for a week.

What it costs:

Speed. The documented range is 10x to 30x, roughly an order of magnitude worse than ASan's 2x, and --track-origins=yes about doubles it again and adds at least 100MB. A suite that takes four minutes under ASan can take an hour under memcheck. That is why it is on-demand and never a per-PR gate.

Coverage of bug classes. This is the important one and it is where people give a vague answer. Memcheck only knows about the heap. It intercepts malloc and new and tracks those blocks. It has no visibility into stack frame layout or into the global data segment, so a stack buffer overflow and a global buffer overflow — both of which ASan catches trivially via redzones the compiler inserted — are simply not detected. Use-after-return is likewise outside its model.

Concurrency behaviour. Valgrind serializes threads onto one core by design, which changes timing dramatically. Race conditions that reproduce under normal scheduling often will not reproduce under memcheck, and the tool is not a race detector anyway — Helgrind and DRD are separate Valgrind tools for that, and TSan is generally better.

The command you should be able to write without looking it up:

  valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all \\
           --track-origins=yes --error-exitcode=1 \\
           --suppressions=valgrind.supp ./my_test

--error-exitcode=1 is the one people forget, and it matters for the same reason recoverable UBSan matters: without it valgrind exits with the program's own status and CI never notices the errors. --gen-suppressions=all prints ready-made suppression stanzas for findings you have triaged as third-party noise.

The summary answer: ASan by default because it is ten times faster and catches stack and global errors memcheck cannot; memcheck when you cannot rebuild, when you need uninitialized-read detection without instrumenting the world, or when you want the four-way leak classification.`,
      },
      {
        question: 'How does ASan actually detect a heap buffer overflow, and what classes of memory bug does it structurally miss?',
        answer: `Detection mechanism, end to end:

At compile time the instrumentation pass rewrites every load and store. Before the access, the generated code computes the shadow address as (addr >> 3) + offset — a shift and an add, which is why the overhead is a small constant factor rather than a trap into a runtime on every access — loads that shadow byte, and branches to a slow-path report function if the byte says the granule is not fully addressable. For an unaligned or partial access there is extra logic comparing the access offset against the 1-through-7 partial value.

At allocation time the ASan allocator does not hand back a bare block. It reserves the requested size plus redzones on both sides, records allocation metadata including the allocating stack, marks the user region's shadow as addressable (00, with a partial value for a non-multiple-of-8 tail) and marks the redzones with the heap redzone poison code.

So a write one byte past the end of a 20-byte allocation targets the first byte of the right redzone. The shadow byte for that granule is poisoned. The check fails. ASan reports at that instruction, prints the access stack, looks up the containing allocation from its metadata, and prints the allocation stack and the offset relationship — "1 bytes to the right of 20-byte region". The whole value of the tool is in that phrase: you get the overflow at the moment of the overflow, with the allocation site attached, instead of a corrupted neighbour that crashes later.

Free works the same way in reverse: the block goes into quarantine rather than back to the free list, the shadow is set to the freed code, and the freeing stack is recorded. A later access hits poisoned shadow and the report carries three stacks — access, free, allocate.

Stack and global objects get the same treatment through different plumbing. The compiler lays out stack frames with poisoned gaps between locals and emits code to poison and unpoison them at scope entry and exit, which is what makes use-after-scope detectable. Globals get a poisoned tail emitted by the compiler and registered with the runtime at startup.

What ASan structurally misses:

Uninitialized reads. ASan answers "is this address valid", not "does this address hold a defined value". Reading a freshly malloc'd int is perfectly addressable and completely undefined. That is MemorySanitizer's job, or memcheck's.

Data races. ASan has no concept of happens-before or of thread ordering. A race on a valid, live object is invisible to it. That is ThreadSanitizer.

Intra-object overflow. If a struct has two adjacent members and you overrun the first into the second, both bytes belong to the same allocation, both shadow bytes read 00, and nothing fires. There is no redzone between members of the same object. This is a real gap — it is why -fsanitize=address does not catch every bounds bug in a struct-heavy codebase.

Overflow that skips the redzone. A wild index like buf[100000] on a small allocation may land in an unrelated live allocation whose shadow reads addressable. The corruption is real and silent. Redzones catch adjacent overruns, not arbitrary ones.

Custom allocators. If your code carves objects out of a big slab obtained from one malloc, ASan sees one valid region and every intra-slab overflow looks legal. The fix is the manual poisoning interface in sanitizer/asan_interface.h, which lets an allocator tell ASan which sub-ranges are live — genuinely worth mentioning, because it shows you have integrated ASan with a real memory pool rather than only run it on toy code.

Uninstrumented code. Anything compiled without -fsanitize=address is a blind spot, including the standard library unless you have an instrumented one. Container overflow detection specifically depends on an instrumented libc++, and mixing instrumented and uninstrumented STL objects is a known false-positive source that ASAN_OPTIONS=detect_container_overflow=0 exists to work around.

Logic bugs. The obvious one people forget to say: ASan verifies memory safety, not correctness. A program that computes the wrong answer using perfectly valid memory is green under every sanitizer there is.`,
      },
    ],
    references: [
      'https://clang.llvm.org/docs/AddressSanitizer.html',
      'https://clang.llvm.org/docs/ThreadSanitizer.html',
      'https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html',
      'https://clang.llvm.org/docs/MemorySanitizer.html',
      'https://valgrind.org/docs/manual/mc-manual.html',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 17. C++ Test Automation and Coverage
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-cpp-testing',
    title: 'C++ Test Automation and Coverage',
    icon: 'checkCircle',
    color: '#ea580c',
    questions: 5,
    description: 'GoogleTest and GoogleMock, Catch2 and doctest, CTest as the runner, and coverage with gcov/lcov and llvm-cov. Covers test tiering, flake hunting, and coverage gates that are not trivially gamed.',
    visualizations: [
      {
        title: 'From TEST macro to CTest to a coverage report',
        image: '/diagrams/devops/nb-17-cpp-testing.png',
        description: `A C++ test pipeline has three layers that are frequently conflated: the framework that defines assertions and fixtures, the runner that schedules and reports, and the coverage instrumentation that measures what was executed. They are independent choices, and most dysfunction in a C++ test suite comes from treating them as one thing.

Layer one, the framework:

GoogleTest is the default choice in most large C++ codebases. TEST(Suite, Name) defines a standalone test. TEST_F(Fixture, Name) attaches to a fixture class derived from testing::Test, and the framework constructs a fresh fixture instance for every test, calls SetUp(), runs the body, calls TearDown(), and destroys it — per test, not per suite, which is the isolation guarantee people rely on without knowing they rely on it. Assertions come in pairs: ASSERT_ aborts the current function on failure, EXPECT_ records the failure and continues. Prefer EXPECT_ so one run reports every problem; use ASSERT_ when continuing would dereference null or read past the end.

Beyond the basics, TEST_P plus INSTANTIATE_TEST_SUITE_P runs one test body across a set of values, with each value appearing as a separately named test in the report. TYPED_TEST_SUITE plus TYPED_TEST runs one body across a list of types, which is how you verify a container or trait against char, int and a user type without duplication. Death tests — ASSERT_DEATH, EXPECT_EXIT — fork the process and assert that it terminates with a matching message; suites whose names end in DeathTest are scheduled first, and they must run single-threaded, which is what the threadsafe death test style exists to enforce. EXPECT_THAT plus matchers (ElementsAre, Field, Property, Optional, Pointwise) turns an opaque boolean failure into a printed diff of the actual container.

GoogleMock supplies MOCK_METHOD to declare mock members and EXPECT_CALL to set expectations with cardinality and actions. The default mock is naggy: an unexpected call warns but does not fail. NiceMock suppresses the warnings, StrictMock turns them into failures. Expectations are verified when the mock is destroyed, which is why an unmet EXPECT_CALL reports at a line number nowhere near the logic that was supposed to make the call.

Catch2 and doctest are the lighter alternatives. Catch2 v3 is no longer header-only — it is compiled as a static library you link as Catch2WithMain — precisely because the v2 single-header model was a compile time problem; the project reports roughly 80 percent reduction in inclusion overhead as a result. doctest remains single-header and is the fastest to compile, which is the whole reason it exists. The general lesson: a header-only test framework puts thousands of lines of template code into every test translation unit, and in a repo with hundreds of test files that dominates build time.

Layer two, the runner:

CTest does not know what GoogleTest is. It runs commands and interprets exit codes. add_test(NAME x COMMAND y) registers one command; gtest_discover_tests() from CMake's GoogleTest module runs the built binary to enumerate its tests and registers each one separately, which is what gives per-test parallelism, per-test timeouts, and a failure report that names the test rather than the binary.

Test properties are where the real scheduling control lives: LABELS for tiering, TIMEOUT per test, RUN_SERIAL for a test that must not share the machine, RESOURCE_LOCK to serialize a specific set of tests against each other while everything else still runs in parallel, FIXTURES_SETUP / FIXTURES_REQUIRED / FIXTURES_CLEANUP for setup and teardown tests that must bracket a group, WILL_FAIL, SKIP_RETURN_CODE, ENVIRONMENT, PROCESSORS and COST.

The invocation flags that matter day to day: ctest -j for parallelism, --output-on-failure so you see stdout only for failures, -L to select a label tier, -R and -E to include and exclude by name regex, --rerun-failed to iterate on just the broken ones, --repeat until-fail:50 for flake hunting, --repeat until-pass:3 for the retry policy you should resist adding, --schedule-random to expose order dependencies, --stop-on-failure, --timeout, and --output-junit for CI reporting.

Layer three, coverage:

Two toolchains. The GCC lineage: compile and link with --coverage, which emits a .gcno next to each object at compile time and writes a .gcda at process exit; gcov turns those into per-line counts, lcov aggregates into a .info file and genhtml renders it, with branch data behind --rc branch_coverage=1. The LLVM lineage: -fprofile-instr-generate -fcoverage-mapping, LLVM_PROFILE_FILE controlling raw profile paths with patterns like %p for pid and %Nm for a merge pool, llvm-profdata merge -sparse to index, then llvm-cov show, report or export. llvm-cov reports six metrics of increasing granularity — function, instantiation, line, region, branch, MC/DC — and -fcoverage-mcdc enables the last.`,
      },
      {
        title: 'Quick-fire interview answers — C++ testing',
        description: `Q: Why gtest_discover_tests instead of a single add_test for the whole binary?
A: Granularity. One add_test means CTest sees one pass/fail for hundreds of tests, cannot parallelize inside it, cannot apply a per-test timeout, and a crash loses every result in that binary. gtest_discover_tests enumerates the binary's tests and registers each one, so you get per-test scheduling, timeouts, labels and reporting. The tradeoff is that discovery has to execute the test binary, which needs care when cross-compiling.

Q: A test passes alone and fails under ctest -j16. First hypothesis?
A: Shared mutable external state — a fixed port, a fixed temp file path, a shared database or a working directory. Confirm with ctest --schedule-random and by running the suspect pair together. Fix by removing the sharing; if you genuinely cannot, RESOURCE_LOCK on a named lock serializes just those tests while the rest still run in parallel. RUN_SERIAL is the blunter version that stops everything else.

Q: Why does branch coverage matter more in C++ than line coverage?
A: Because a single C++ line routinely contains multiple decisions. Short-circuit && and ||, ternaries, default arguments, and implicit destructor and exception-unwinding paths all live on one source line. Line coverage marks that line green once any path through it executes. Branch coverage requires each decision outcome to have been taken, which is what actually exercises the error handling.

Q: Your coverage number went from 61% to 84% in a sprint and quality did not change. What happened?
A: Almost certainly tests that execute code without asserting on it — instantiating objects, calling getters, or a parameterized test sprayed over inputs with a trivial assertion. Coverage measures execution, not verification. The counters that resist this are diff coverage on changed lines, branch rather than line, and mutation testing, which fails when a deliberately broken build still passes the suite.

Q: How do you hunt a flaky test?
A: ctest --repeat until-fail:100 -R FlakyName to establish a rate, --schedule-random and running under -j to surface ordering and contention, --gtest_shuffle with a recorded --gtest_random_seed for reproducibility, and a TSan build if the flake involves threads. Quarantining with --repeat until-pass hides the signal and should be a temporary label, never the fix.

Q: A test crashes and its coverage data is missing. Why?
A: gcov writes .gcda at normal process exit. A test that segfaults, aborts under a sanitizer, or calls _exit never flushes. Call __gcov_dump at a checkpoint, or use LLVM source-based coverage with the %c continuous mode pattern in LLVM_PROFILE_FILE, which keeps the counters synced so a crash still yields usable data.`,
      },
    ],
    introduction: `A C++ test suite has failure modes that other ecosystems mostly do not. Tests are compiled artifacts, so the suite has a build time as well as a run time, and in a large repo the build often dominates. Tests share a process, so one test's global state leaks into the next. Tests can crash the runner rather than fail politely, taking every other test in the binary with them. And coverage instrumentation interacts with optimization in ways that make the numbers subtly wrong if you do not know what you are looking at.

The framework layer is largely settled. GoogleTest is the default for anything large: fixtures with per-test construction, value-parameterized and typed tests, death tests, and a matcher library that turns an assertion failure into a readable diff. GoogleMock adds MOCK_METHOD and EXPECT_CALL for interaction testing. Catch2 and doctest are the alternatives, chosen mostly for compile time — and the fact that Catch2 v3 abandoned the single-header model and became a linked library is the clearest evidence available that header-only test frameworks are a build time liability at scale.

CTest is the runner, and it is deliberately dumb: it executes commands and reads exit codes. That neutrality is why it works with any framework, and it is also why the interesting engineering is in how you register tests and what properties you attach. Registering one test per binary is the common mistake; gtest_discover_tests enumerating each test individually is what buys per-test timeouts, per-test parallelism, and a failure report that names the test instead of the executable. Labels tier the suite, RESOURCE_LOCK serializes the minimum necessary rather than the whole run, and --output-junit feeds the CI reporting layer.

Coverage is where the most confident wrong answers get given. There are two toolchains — GCC's --coverage plus gcov, lcov and genhtml, and LLVM's -fprofile-instr-generate -fcoverage-mapping plus llvm-profdata and llvm-cov — and they are not interchangeable within one build. More importantly, there are several distinct metrics. Line coverage says a line executed. Branch coverage says each decision outcome was taken. MC/DC, required by DO-178C for avionics software, says each condition in a compound decision was independently shown to affect the outcome. In C++ the gap between line and branch is unusually wide, because short-circuit operators, ternaries, and implicit destructor and unwinding paths all pack multiple decisions onto one line.

The judgment an interviewer is looking for is about tiering and about gates. A suite that takes forty minutes stops being run before merge, and once that happens its value collapses regardless of coverage percentage. The answer is a fast tier of hermetic unit tests measured in seconds that gates every commit, and a slow tier of integration tests holding real resources that runs less often — expressed concretely as ctest -L unit versus ctest -L integration, with RESOURCE_LOCK on the tests that contend.

And a coverage gate is only useful if it cannot be satisfied without adding verification. A global percentage threshold is trivially gamed by executing code without asserting on it, and it punishes whoever happens to touch a badly covered file next. Diff coverage on changed lines, branch rather than line, and mutation testing as the honest check are the things that survive contact with a team under deadline.`,
    whenToUse: [
      'Standing up a test suite in a large C++ repo: GoogleTest plus GoogleMock plus gtest_discover_tests, because per-test CTest registration is what makes everything downstream possible',
      'Choosing a lighter framework: doctest when test binary compile time is the binding constraint, Catch2 v3 when you want its expression decomposition and are willing to link a library',
      'Tiering a suite that has grown past the point where developers run it: LABELS unit and integration, ctest -L unit pre-merge, ctest -L integration nightly',
      'Tests that contend on a fixed port, a shared database, or a GPU: RESOURCE_LOCK to serialize exactly those, keeping -j parallelism for everything else',
      'Chasing a flake: ctest --repeat until-fail:100 -R name, --schedule-random, and a TSan build if threads are involved',
      'Introducing a coverage gate: llvm-cov or lcov with branch coverage on, enforced as diff coverage on changed lines rather than a global percentage',
    ],
    keyConcepts: [
      {
        term: 'TEST_F fixture lifecycle',
        definition: 'GoogleTest constructs a fresh fixture instance for each test, calls SetUp(), runs the body, calls TearDown(), then destroys it. Per test, not per suite. Anything shared across tests must be a static or a SetUpTestSuite member, and that sharing is where cross-test contamination comes from.',
      },
      {
        term: 'ASSERT_ vs EXPECT_',
        definition: 'ASSERT_ produces a fatal failure and returns from the current function immediately; EXPECT_ produces a nonfatal failure and continues. Default to EXPECT_ so one run surfaces every problem. Use ASSERT_ only when continuing would dereference a null pointer or index out of range.',
      },
      {
        term: 'TEST_P and INSTANTIATE_TEST_SUITE_P',
        definition: 'Value-parameterized tests: one body, a set of inputs, and each input registered as its own named test. Unlike a for loop inside a single TEST, a failing case is individually named, individually reportable, individually rerunnable with --gtest_filter, and does not stop the remaining cases.',
      },
      {
        term: 'gtest_discover_tests',
        definition: 'CMake GoogleTest module function that runs the built test binary to enumerate its tests and registers each one with CTest. Yields per-test parallelism, timeouts, labels and reporting. gtest_add_tests is the older variant that scrapes source files and misses anything generated by a macro.',
      },
      {
        term: 'RESOURCE_LOCK',
        definition: 'A CTest test property naming resources this test locks. Tests declaring the same lock never run concurrently; everything else still runs in parallel. The targeted alternative to RUN_SERIAL, which stops all other tests. Orthogonal to RESOURCE_GROUPS, which allocates counted instances rather than providing mutual exclusion.',
      },
      {
        term: 'ctest --repeat until-fail:N',
        definition: 'Runs each selected test up to N times and passes only if every iteration passes. The flake-hunting mode. until-pass:N is the opposite — accept the first success — and is a retry policy that hides flakes rather than finding them.',
      },
      {
        term: 'gcov vs source-based coverage',
        definition: 'GCC: --coverage emits .gcno at compile time and .gcda at process exit, consumed by gcov and aggregated by lcov and genhtml. LLVM: -fprofile-instr-generate -fcoverage-mapping writes .profraw controlled by LLVM_PROFILE_FILE, indexed by llvm-profdata merge -sparse, reported by llvm-cov. Do not mix them in one build.',
      },
      {
        term: 'Line vs branch vs MC/DC coverage',
        definition: 'Line: this line executed. Branch: each outcome of each decision was taken. MC/DC: each condition in a compound decision was independently shown to change the outcome, requiring roughly N+1 test cases for N conditions. llvm-cov exposes all three plus function, instantiation and region metrics; -fcoverage-mcdc enables the last.',
      },
    ],
    approach: [
      'Register tests individually: enable_testing(), include(GoogleTest), and gtest_discover_tests(my_tests) rather than one add_test for the whole binary',
      'Label every test at registration time with a tier — unit for hermetic and sub-second, integration for anything touching a network, filesystem or database — because retrofitting labels onto a thousand tests never happens',
      'Give every test an explicit TIMEOUT. A hung test with no timeout occupies a CI worker until the job-level limit kills the entire run and you lose all results, not just that one',
      'Identify the tests that contend on a fixed resource and give them a shared RESOURCE_LOCK name, then verify with ctest -j16 --schedule-random run repeatedly that the suite is genuinely order independent',
      'Wire CI to ctest -j --output-on-failure --output-junit results.xml, and configure the reporting step to publish the JUnit file so failures are readable without opening raw logs',
      'Add a coverage build as a separate configuration with -O0 (optimization merges lines and misattributes counts), generate HTML with genhtml or llvm-cov show --format=html, and publish it as an artifact before you gate on it',
      'Turn the gate on as diff coverage over changed lines with branch coverage enabled, and only after the team has seen the report for a few weeks and agreed the exclusions are honest',
    ],
    pitfalls: [
      'One add_test for an entire GoogleTest binary — CTest sees a single pass/fail, cannot parallelize or time out individual tests, and a segfault in test 3 destroys the results of the other 900',
      'Tests that share process-global state: a static registry, a cached singleton, a modified locale or working directory. They pass in file order and fail under --schedule-random, and the team concludes the runner is broken',
      'Reaching for --repeat until-pass to quiet a flake. The test now passes and the underlying race is permanently invisible, until it becomes a production incident with no test coverage of the failure mode',
      'Building the coverage configuration with -O2. Optimization merges and reorders lines, so gcov attributes counts to lines that never ran and shows zero for lines that did, and the report becomes untrustworthy in a way that is hard to notice',
      'Measuring coverage over a run where several tests crashed. Under gcov a process that aborts never writes its .gcda, so the crashed tests contribute nothing and the number silently understates or, worse, the run is treated as valid',
      'Gating on a global coverage percentage. It is satisfied by executing code without asserting on it, and it blocks the next person who touches an already-uncovered legacy file for reasons unrelated to their change',
    ],
    keyQuestions: [
      {
        question: 'Design the CMake and CTest layout for a repo with 4000 fast unit tests and 60 integration tests that need a real database and a fixed port.',
        answer: `The shape of the answer is two tiers, per-test registration, and resource locks for the contended cases.

Registration. Use gtest_discover_tests so CTest sees 4060 individual tests rather than a handful of binaries:

  enable_testing()
  include(GoogleTest)

  add_executable(unit_tests \${UNIT_SOURCES})
  target_link_libraries(unit_tests PRIVATE core GTest::gtest_main GTest::gmock)
  gtest_discover_tests(unit_tests
    PROPERTIES LABELS "unit" TIMEOUT 10)

  add_executable(integration_tests \${INTEGRATION_SOURCES})
  target_link_libraries(integration_tests PRIVATE core GTest::gtest_main)
  gtest_discover_tests(integration_tests
    PROPERTIES LABELS "integration" TIMEOUT 300)

Two things this buys immediately: a hung test is killed at 10 seconds instead of consuming a worker until the job limit, and a crash in one test does not erase the results of the rest of the binary.

Contention. The integration tests that bind a fixed port or write the same database schema must not run concurrently with each other:

  set_tests_properties(db_migration_test db_rollback_test db_index_test
    PROPERTIES RESOURCE_LOCK "postgres")
  set_tests_properties(http_server_test http_tls_test
    PROPERTIES RESOURCE_LOCK "port_8443")

RESOURCE_LOCK serializes only the tests sharing a lock name; the other 4000 keep running at full parallelism. RUN_SERIAL is the wrong tool here because it stops everything else too. If a test really needs exclusive access to the whole machine — a benchmark measuring wall clock, for instance — that is when RUN_SERIAL is correct.

Setup and teardown that must bracket a group is the fixture properties, not a hand-rolled first test:

  set_tests_properties(db_setup   PROPERTIES FIXTURES_SETUP   db)
  set_tests_properties(db_teardown PROPERTIES FIXTURES_CLEANUP db)
  set_tests_properties(db_migration_test db_rollback_test
                       PROPERTIES FIXTURES_REQUIRED db)

CTest then runs db_setup before any test requiring the db fixture, runs db_teardown after, and — the part that matters — pulls in the setup automatically when you run a single test with -R, so ctest -R db_rollback_test works standalone.

Invocation. Two commands, two schedules:

  ctest -L unit -j$(nproc) --output-on-failure --output-junit unit.xml
  ctest -L integration -j4 --output-on-failure --output-junit integ.xml

The unit tier runs on every push and must stay under a couple of minutes. The integration tier runs on merge to main and nightly. -j4 rather than -j$(nproc) for integration because the constraint there is the database, not CPU.

Hygiene the interviewer will want you to volunteer. Prove the suite is order independent by running ctest -j16 --schedule-random in a loop overnight before you trust the parallelism; anything that only passes in declaration order has hidden shared state. Add --stop-on-failure only to fast local iteration, never to CI, because CI should report every failure in one pass. Keep --rerun-failed in the developer workflow so fixing a batch does not mean re-running 4000 tests.

The anti-answer: one add_test per binary plus a shell script that sets up the database, with parallelism disabled because "the tests interfere". That is the state most repos are actually in, and describing the migration away from it is a stronger answer than describing a greenfield ideal.`,
      },
      {
        question: 'Explain line, branch and MC/DC coverage, and why branch coverage matters more in C++ specifically.',
        answer: `Line coverage asks: did this source line execute at least once. It is the cheapest metric and the easiest to report, and it is the one almost every dashboard shows.

Branch coverage asks: for every decision point, was each outcome taken at least once. An if needs both the true and the false path. A switch needs every case including default.

MC/DC — Modified Condition/Decision Coverage — asks something stronger about compound conditions: for a decision made up of several conditions, each condition must be shown to independently affect the outcome, holding the others fixed. For N conditions that requires roughly N+1 well-chosen test cases rather than the 2^N of exhaustive combination. It is mandated by DO-178C Level A for avionics and appears in comparable form in other safety standards. Clang supports it via -fcoverage-mcdc with llvm-cov --show-mcdc.

llvm-cov actually reports six metrics in increasing granularity — function, instantiation, line, region, branch and MC/DC — and it is worth knowing that 100 percent branch coverage of a function implies 100 percent region coverage of it.

Why the line-versus-branch gap is unusually wide in C++:

Short-circuit operators. Consider:

  if (ptr != nullptr && ptr->ready() && ptr->count() > 0) { handle(ptr); }

One line. Line coverage goes green the moment any test reaches it. But a test where ptr is null exercises exactly one of three conditions and never calls ready() or count() at all. Branch coverage demands each of those short-circuit decisions be taken both ways. The null-pointer guard you wrote and never tested reads as covered under line coverage.

Ternaries and default arguments. A ternary is a full decision on one line. A default argument means the call site has two distinct behaviours with no textual branch to see.

Implicit paths the compiler generates. This is the C++-specific part and the one that impresses. Every scope exit runs destructors, and every function that can throw has unwinding edges the source does not show. A line containing a constructor has an implicit branch between normal completion and the exception path. Line coverage cannot represent these; region and branch coverage partially can. It is why a codebase with 90 percent line coverage can have never once executed a destructor during exception unwinding, which is where RAII bugs live.

Templates. Coverage is measured on instantiations. A template covered for int and untested for a type with a throwing copy constructor is reported as covered, because the instantiation you tested was. llvm-cov's separate instantiation coverage metric exists precisely to expose this, and it is routinely ignored.

Practical guidance to close with: enable branch coverage explicitly — it is off by default in both toolchains, needing --rc branch_coverage=1 for lcov and --show-branches=count for llvm-cov — and build the coverage configuration at -O0, because optimization merges lines and misattributes counts. Reserve MC/DC for the safety-critical subset where a standard requires it; on ordinary application code its cost in test cases outruns its value, and the honest general-purpose upgrade over branch coverage is mutation testing.`,
      },
      {
        question: 'A test passes when run alone and fails under ctest -j16. Walk me through diagnosing it.',
        answer: `The diagnosis is a search over four hypotheses, ordered by how often each is the answer.

First, confirm the shape of the failure. Run the test alone twenty times to establish it is genuinely stable in isolation:

  ctest -R FlakyName --repeat until-fail:20

If it fails in isolation too, this is not a parallelism problem, it is an ordinary flake — go to threads and timing directly. If it only fails under -j, continue.

Hypothesis one: shared external state. By far the most common. Two tests use the same hardcoded port, the same /tmp path, the same database or schema name, the same file in the source tree, or they both chdir. Under sequential execution they never overlap; under -j16 they do. Detect it by grepping the test sources for literal ports and paths, and by running the suspected pair together:

  ctest -R "TestA|TestB" -j2 --repeat until-fail:50

Fix by removing the sharing — a port of 0 and asking the OS which one it got, a unique temp directory per test, a schema name derived from the test name. If the resource is genuinely singular, RESOURCE_LOCK "resource_name" on the affected tests serializes exactly those while the rest of the suite keeps its parallelism.

Hypothesis two: order dependence within a binary. Distinct from resource sharing: test A mutates a process-global — a static registry, a cached singleton, a modified locale, an installed signal handler — and test B depends on the mutated or unmutated value. Parallelism changes which tests share a process and in what order. Detect with:

  ctest --schedule-random --repeat until-fail:30
  ./unit_tests --gtest_shuffle --gtest_random_seed=12345

Record the seed of a failing shuffle so it is reproducible. Then bisect with --gtest_filter to find the minimal pair. The fix is making the global state per-test, usually by moving it into the fixture.

Hypothesis three: resource exhaustion and timing. Sixteen concurrent tests change the machine's characteristics. A test with a hardcoded sleep or a wall-clock assertion that holds on an idle box fails under load. File descriptor and thread limits get hit. Memory pressure appears, especially if the coverage or sanitizer build is in play. Detect by running the same test under artificial load, or by comparing -j16 against -j4. The fix is deleting the timing assumption, not raising the timeout — though a per-test TIMEOUT that is too tight for a loaded machine is a legitimate and separate finding.

Hypothesis four: a real data race in the code under test. Parallelism increased CPU contention and changed thread interleaving inside a single multithreaded test. This is where the earlier hypotheses fail to explain anything and you rebuild:

  cmake -B build/tsan -DCMAKE_CXX_FLAGS="-fsanitize=thread,undefined -g -O1"
  ctest --test-dir build/tsan -R FlakyName --repeat until-fail:20

TSan finds races that did not manifest, because it reasons about happens-before rather than observed interleaving.

Two things to say explicitly, because they are what distinguishes an engineer from a firefighter. First, --repeat until-pass:3 makes the symptom disappear and the bug permanent; if you must use it, it goes with a quarantine label and a tracking issue, not as a fix. Second, a test that only fails in parallel is frequently telling you the production code has a concurrency assumption nobody wrote down — the test is not always the thing that is wrong.`,
      },
      {
        question: 'When would you use TEST_P versus TYPED_TEST versus a plain loop inside one TEST, and what do you give up with the loop?',
        answer: `They answer three different questions: vary the data, vary the type, or do neither and lose your reporting granularity.

TEST_P — value-parameterized — is for one behaviour across many inputs:

  class ParseTest : public testing::TestWithParam<std::string_view> {};

  TEST_P(ParseTest, RoundTrips) {
    auto v = parse(GetParam());
    ASSERT_TRUE(v.has_value());
    EXPECT_EQ(serialize(*v), GetParam());
  }

  INSTANTIATE_TEST_SUITE_P(Wire, ParseTest,
      testing::Values("{}", "[1,2]", "\\"x\\"", "null"));

GoogleTest registers each value as its own named test — Wire/ParseTest.RoundTrips/0 and so on. Combine generators with testing::Combine, ValuesIn over a container, and Range. Supply a name generator as the fourth argument to INSTANTIATE_TEST_SUITE_P when the default numeric suffixes are unreadable, because a failure reported as case 17 with no other information is only marginally better than a loop.

TYPED_TEST is for one behaviour across many types — the standard use is verifying that a generic container or algorithm holds for every type it claims to support:

  template <typename T> class ContainerTest : public testing::Test {
   protected:
    Container<T> c_;
  };
  using MyTypes = testing::Types<int, std::string, MoveOnly>;
  TYPED_TEST_SUITE(ContainerTest, MyTypes);

  TYPED_TEST(ContainerTest, PushThenSizeIsOne) {
    this->c_.push(TypeParam{});
    EXPECT_EQ(this->c_.size(), 1u);
  }

Note this-> on fixture members: the fixture is a dependent base in a template, so unqualified name lookup does not find them. That detail alone tells an interviewer whether you have written typed tests or only read about them. Use TYPED_TEST_SUITE_P and REGISTER_TYPED_TEST_SUITE_P when the type list is not known where the tests are defined, which is how you ship a conformance suite that a downstream implementer instantiates for their own type.

What the loop costs you:

  TEST(ParseTest, RoundTrips) {
    for (auto s : {"{}", "[1,2]", "\\"x\\"", "null"}) {
      auto v = parse(s);
      ASSERT_TRUE(v.has_value());
    }
  }

One name in the report, so a CI failure says ParseTest.RoundTrips failed and you read logs to learn which input. The ASSERT_ aborts the whole test on the first bad case, so you never learn whether the remaining three also broke — and if you downgrade to EXPECT_ you at least continue, but the failure messages carry no input identity unless you add SCOPED_TRACE by hand. You cannot rerun one case: --gtest_filter has nothing to select and neither does ctest -R. CTest sees one test, so the cases cannot be distributed across parallel workers, and one runaway input makes the whole aggregate test time out. Flake data is unusable because the history is aggregated. And a crash in case two silently hides cases three and four.

When the loop is genuinely fine: two or three inputs, a fixture that is expensive to construct relative to the assertions, and no realistic chance you will want to run one case in isolation. Adding SCOPED_TRACE(s) inside the loop recovers the input identity in the failure message and is the minimum decency if you go this route.

The rule I would state: if a case could plausibly fail on its own, it deserves its own name in the test report. TEST_P gives you that for free.`,
      },
      {
        question: 'How do you enforce a coverage gate that actually improves quality instead of getting gamed?',
        answer: `Start by naming what coverage measures, because the gate design follows from it: coverage measures which code was executed, not which behaviour was verified. Every failure mode of a coverage gate comes from that gap.

The gates that fail, and why:

A global percentage floor — say 80 percent — is satisfied by executing code without asserting on it. A test that constructs every object and calls every getter with no EXPECT_ at all moves the number substantially. It also allocates blame wrongly: whoever next touches a legacy file with 20 percent coverage is blocked by a debt they did not create, so the rational response is to avoid touching that file, which is the opposite of what you wanted.

A ratchet that only allows the number to go up sounds better and creates a different bad incentive: deleting a poorly covered file raises the percentage, and so does refusing to add a new module until it is fully tested, which pushes work out of the repo.

Excluding files until the number looks acceptable is the version that dies quietly. Six months later the exclusion list is the interesting half of the codebase and nobody remembers why any entry is there.

What actually works, in the order I would introduce it:

Diff coverage as the gate. Measure coverage of the lines added or changed in this pull request, and require a high bar there — 80 to 90 percent is reasonable — with no requirement on the rest of the file. New code is held to a standard, legacy code is not a tax on the next person to touch it, and the number improves monotonically as the codebase turns over. This is the single most important change and it is usually enough on its own.

Branch coverage, not line. Enable it explicitly, because it is off by default in both toolchains: --rc branch_coverage=1 for lcov, --show-branches=count for llvm-cov. In C++ the difference is large — short-circuit conditions, ternaries and implicit unwinding paths all hide behind a covered line — and it is materially harder to hit a branch target without writing real cases.

Mutation testing as the honest check, run on a schedule rather than per-PR because it is expensive. Deliberately alter the program — flip a comparison, change a constant, remove a statement — rebuild and rerun. Every mutant that survives is a line your suite executes but does not verify. A high line coverage number with a low mutation kill rate is the precise, quantitative statement of a gamed suite, and it is the argument that ends the debate in a room.

Review the report, not the number. Publish the HTML — genhtml for lcov, llvm-cov show --format=html for LLVM — as a CI artifact and link it from the PR. Reviewers looking at which branches are red catch missing error-path tests that no aggregate percentage would have flagged.

Mechanics that have to be right or the numbers lie: build the coverage configuration at -O0, since optimization merges and reorders lines and misattributes counts; make sure crashed or sanitizer-aborted tests are noticed, because gcov writes .gcda only at normal exit so those tests silently contribute nothing; use llvm-profdata merge -sparse across the whole run rather than per-test profiles; and exclude generated code, third-party vendored sources and the tests themselves from the denominator, with the exclusion list checked in and reviewable rather than living in CI configuration.

The one-sentence version: gate on diff coverage with branches enabled, verify the suite periodically with mutation testing, and treat any global percentage as a trend to watch rather than a threshold to enforce.`,
      },
    ],
    references: [
      'https://google.github.io/googletest/primer.html',
      'https://google.github.io/googletest/advanced.html',
      'https://cmake.org/cmake/help/latest/manual/ctest.1.html',
      'https://clang.llvm.org/docs/SourceBasedCodeCoverage.html',
      'https://github.com/linux-test-project/lcov',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 18. Static Analysis in CI
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-static-analysis',
    title: 'Static Analysis for C/C++ in CI',
    icon: 'eye',
    color: '#ea580c',
    questions: 5,
    description: 'Compiler warnings, clang-tidy, the clang static analyzer, cppcheck and the commercial tools — what each finds, how to roll analysis onto a legacy codebase without blocking everyone, and how SARIF and diff-scoped runs make it survivable.',
    visualizations: [
      {
        title: 'The analysis ladder: warnings, clang-tidy, path-sensitive analysis, commercial',
        image: '/diagrams/devops/nb-18-static-analysis.png',
        description: `Static analysis for C and C++ is a ladder, not a product choice. Each rung costs more time and finds a different class of defect, and a mature pipeline runs several rungs at different cadences.

Rung one: compiler warnings. The cheapest analysis you will ever get, because the compiler already built the AST. The trap is believing -Wall -Wextra means all warnings. It does not. -Wall enables the constructions most people consider questionable — uninitialized use, unused variables, format string mismatches at level 1, missing braces, return type problems. -Wextra adds sign comparison, maybe-uninitialized, missing field initializers, unused parameters, type limits, implicit fallthrough. Neither enables -Wshadow, -Wconversion, -Wsign-conversion, -Wdouble-promotion, -Wformat=2, or the C++-specific -Wold-style-cast, -Wnon-virtual-dtor and -Wuseless-cast. -Wnull-dereference only works with optimization on, because it depends on the optimizer's path information.

The ones people wrongly disable are predictable. -Wconversion and -Wsign-conversion are noisy on legacy code and are turned off in bulk, which removes an entire class of narrowing and signedness bugs. -Wmaybe-uninitialized has genuine false positives that vary by GCC version and optimization level, and gets disabled globally instead of suppressed locally. -Wshadow trips on constructor parameters that intentionally match member names and gets removed rather than addressed with a naming convention. -Wnon-virtual-dtor is the one that costs the most when ignored.

Rung two: clang-tidy. An AST-matching linter with a plug-in check architecture. Checks are namespaced by prefix — bugprone-, cert-, clang-analyzer-, concurrency-, cppcoreguidelines-, google-, hicpp-, misc-, modernize-, performance-, portability-, readability- — and selected with globs where a leading dash disables: -checks=-*,bugprone-*,performance-* means everything off, then those two groups on. Configuration belongs in a checked-in .clang-tidy YAML file with Checks, WarningsAsErrors, HeaderFilterRegex and CheckOptions keys, inherited down the directory tree.

The structural requirement is a compilation database. clang-tidy must know the exact flags each file was compiled with, which means compile_commands.json, produced by CMake with -DCMAKE_EXPORT_COMPILE_COMMANDS=ON and passed via -p. Without it, clang-tidy guesses at include paths and standard version and produces parse errors that look like findings. run-clang-tidy parallelizes across the whole database; clang-tidy-diff.py reads a unified diff and analyzes only the changed lines, which is the mechanism that makes analysis affordable on a large repo. Suppression is inline via NOLINT, NOLINTNEXTLINE, and NOLINTBEGIN/NOLINTEND, each optionally scoped to a check glob.

Rung three: path-sensitive analysis. The clang static analyzer symbolically executes paths through a function rather than pattern-matching the AST, which lets it find null dereferences, leaks and use-after-free that only occur on a specific combination of branches. scan-build drives it by overriding CC and CXX with a wrapper that runs both the real compiler and the analyzer, then emits linked HTML reports; --status-bugs makes it exit nonzero when findings exist. Its checks are also exposed inside clang-tidy under the clang-analyzer- prefix, which is why a clang-tidy run is slower than pure AST matching would suggest. The analyzer is intraprocedural with limited inlining — it does not reason across translation units, which is exactly the boundary the commercial tools sell.

cppcheck sits alongside, valuable because it is independent: a different engine with a different false-positive profile, no compilation database strictly required though --project=compile_commands.json makes it far more accurate, --enable= to select categories, --error-exitcode for CI, an inline and file-based suppression system, and a MISRA addon.

Rung four: commercial. Coverity, PVS-Studio, Klocwork, Helix QAC. What you are buying is whole-program interprocedural analysis across translation unit boundaries, certified rule packs with traceability for MISRA, AUTOSAR, CERT and functional safety audits, and a triage database that remembers every previous decision so a finding dismissed last year does not reappear. What you pay is licence cost, multi-hour full scans that cannot run per-PR, and their own false positives.

The two cross-cutting mechanisms that make any of this survivable in a large repo are diff scoping — analyze only what changed — and SARIF, the 2.1.0 interchange format that lets every tool feed one code-scanning surface that deduplicates results by partialFingerprints and annotates only the lines in the pull request.`,
      },
      {
        title: 'Quick-fire interview answers — static analysis',
        description: `Q: Why does clang-tidy need compile_commands.json?
A: Because it is a real compiler front end, not a text linter. It has to parse the translation unit exactly as the build did — include paths, defines, standard version, target — and it gets those from the compilation database. Generate it with -DCMAKE_EXPORT_COMPILE_COMMANDS=ON and pass -p build. Without it clang-tidy guesses, fails to find headers, and reports parse errors that look like findings and destroy trust in the tool.

Q: Which warnings does -Wall -Wextra not give you?
A: -Wshadow, -Wconversion, -Wsign-conversion, -Wdouble-promotion, -Wformat=2, and on the C++ side -Wold-style-cast, -Wnon-virtual-dtor and -Wuseless-cast. -Wnull-dereference exists but needs optimization enabled to do anything. The naming misleads people into thinking -Wall is exhaustive; it is a curated subset from decades ago.

Q: Why -Werror in CI but not in local dev builds?
A: Two reasons. A compiler upgrade or a new warning flag turns every developer's working tree red simultaneously, for code that was fine yesterday; in CI you control the compiler version and can stage the upgrade. And during exploratory work an unused variable should not block a build you are about to throw away. CMake supports this directly with COMPILE_WARNING_AS_ERROR on the target plus --compile-no-warning-as-error to override locally.

Q: How do you enable clang-tidy on a two-million-line legacy codebase without stopping the team?
A: Never full-repo blocking on day one. Run it in report-only mode to size the problem, pick a narrow high-signal set like bugprone-* and clang-analyzer-*, gate only on lines changed in the pull request using clang-tidy-diff.py, and let the full-repo run happen nightly as a non-blocking trend. Ratchet by adding one check group at a time after the existing findings for it are cleared.

Q: What is SARIF for?
A: A common 2.1.0 output format so clang-tidy, cppcheck, the analyzer and CodeQL all feed one alert surface instead of four log formats. Uploaded via the upload-sarif action or the code-scanning API, deduplicated across runs by partialFingerprints, and surfaced as inline annotations on the lines a pull request actually touched. Limits matter: 25,000 results per run with only the top 5,000 kept, and 10 MB gzip-compressed per file.

Q: A check you enabled is 40 percent false positives. What do you do?
A: Disable that specific check repo-wide and say so in .clang-tidy with a comment. Do not scatter NOLINT through the code to keep it on — that hides the real hits too and encodes the noise permanently. Inline suppression is for a handful of genuine exceptions with a reason attached; a systematically wrong check is a configuration decision, not a per-site one.`,
      },
    ],
    introduction: `Static analysis finds defects without running the program, which makes it complementary to the sanitizers and the test suite rather than a substitute. Sanitizers only see code paths the tests execute; static analysis reads every path in the source but cannot know which ones are reachable in practice. That asymmetry is the whole reason both exist, and it is the first thing an interviewer wants you to articulate.

The landscape is a ladder of cost and depth. Compiler warnings are free because the compiler already parsed the code, and they are the highest-value rung by a wide margin — yet almost every codebase is leaving warnings on the table, because -Wall -Wextra is widely and incorrectly believed to mean everything. clang-tidy is next: an AST-matching linter with several hundred checks organized by prefix, configured by a checked-in .clang-tidy file, requiring a compile_commands.json because it genuinely parses your code the way the compiler did. The clang static analyzer goes deeper still by symbolically executing paths, which finds the null dereference that only happens when two branches both go a particular way. cppcheck is worth running alongside because it is an independent engine with a different false-positive profile. And the commercial tools — Coverity, PVS-Studio, Klocwork — sell whole-program interprocedural analysis, certified MISRA and AUTOSAR rule packs with audit traceability, and a triage database that remembers decisions across releases.

The hard part is not choosing a tool. It is rolling one out onto a codebase that has never had it. Turn on clang-tidy with a broad check set across two million lines and you get tens of thousands of findings, most of them stylistic, in code nobody has touched in years. Gate the build on that and every pull request fails for reasons unrelated to its change. The team's rational response is to disable the tool, and it stays disabled for the next five years.

The technique that solves this is the ratchet. Establish a baseline of existing findings and stop failing on them. Fail only on new findings, which in practice means analyzing only the lines a pull request changed — clang-tidy-diff.py exists exactly for this, and GitHub code scanning does the equivalent natively by only surfacing alerts on lines in the diff. Then burn down the baseline one check group at a time, on a schedule, as ordinary maintenance rather than as a blocker. The codebase improves monotonically and nobody is blocked by debt they did not create.

The second recurring theme is false positives, and the discipline around them. A check that is right ninety-five percent of the time is worth keeping with narrow inline suppressions carrying a reason. A check that is right sixty percent of the time is worth disabling entirely, at the configuration level, with a comment. What kills a program is the middle path: keeping a noisy check enabled and scattering bare NOLINT comments through the source, which suppresses the real hits along with the noise and leaves no record of why.

Interviewers also probe the -Werror question because it separates people who have run a build system for a team from people who have not. Warnings as errors in CI is correct: it is the only thing that stops warning count from growing without bound. Warnings as errors in local development is wrong: a compiler upgrade turns every working tree red at once, and exploratory code with an unused variable should not fail to build. CMake supports the split directly through the COMPILE_WARNING_AS_ERROR property and the --compile-no-warning-as-error escape hatch.`,
    whenToUse: [
      'Every build, everywhere: a strong warning set beyond -Wall -Wextra, with warnings promoted to errors in the CI configuration only',
      'Every pull request: clang-tidy scoped to the changed lines via clang-tidy-diff.py, with a narrow high-signal check set rather than a broad one',
      'Nightly, non-blocking: full-repo clang-tidy and cppcheck producing a trend line and a SARIF upload, so the baseline is visible and shrinking',
      'Weekly or per-release: the clang static analyzer through scan-build, or a commercial whole-program scan, since path-sensitive and interprocedural analysis is too slow for the pull request path',
      'Regulated or safety-critical work: a commercial tool with a certified MISRA, AUTOSAR or CERT rule pack, because the audit needs traceability the open source tools do not produce',
      'Header hygiene on a codebase with runaway build times: include-what-you-use, run manually and reviewed by hand, never applied automatically',
    ],
    keyConcepts: [
      {
        term: 'Compilation database',
        definition: 'compile_commands.json, a JSON array recording the exact compiler invocation for every translation unit. Generated by CMake with -DCMAKE_EXPORT_COMPILE_COMMANDS=ON, or by bear for make-based builds. Required by clang-tidy, IWYU and clang-based tooling generally, and strongly recommended for cppcheck via --project.',
      },
      {
        term: 'clang-tidy check prefixes',
        definition: 'Checks are namespaced by group: bugprone- for error-prone patterns, cert- for CERT secure coding, clang-analyzer- wrapping the path-sensitive static analyzer, concurrency-, cppcoreguidelines-, google-, hicpp-, misc-, modernize-, performance-, portability-, readability-. Selected with globs where a leading dash disables, as in -checks=-*,bugprone-*.',
      },
      {
        term: '.clang-tidy configuration file',
        definition: 'Checked-in YAML with Checks, WarningsAsErrors, HeaderFilterRegex and CheckOptions keys, discovered by walking up the directory tree so subdirectories can inherit and override. Keeping configuration in the repo rather than in CI flags is what makes local and CI runs agree.',
      },
      {
        term: 'HeaderFilterRegex',
        definition: 'Controls which headers clang-tidy reports diagnostics from. Left unset, findings in system and third-party headers are suppressed but findings in your own headers are too, so real bugs in your header-only code are invisible. Set it to match your source root and nothing else.',
      },
      {
        term: 'Path-sensitive vs AST-matching analysis',
        definition: 'clang-tidy matches structural patterns in the syntax tree: fast, local, high recall on known shapes. The clang static analyzer symbolically executes program paths and tracks constraints, finding defects that depend on a specific combination of branches. Slower, and intraprocedural with limited inlining, which is the boundary commercial whole-program tools sell against.',
      },
      {
        term: 'Baseline and ratchet',
        definition: 'The rollout technique for a legacy codebase. Record existing findings as an accepted baseline, fail CI only on new findings, and reduce the baseline on a schedule. Implemented as diff-scoped analysis with clang-tidy-diff.py, as a stored result database in CodeChecker or a commercial tool, or natively by code scanning alerting only on lines in the diff.',
      },
      {
        term: 'SARIF 2.1.0',
        definition: 'The Static Analysis Results Interchange Format that lets heterogeneous tools feed one alert surface. GitHub code scanning accepts only 2.1.0, via the upload-sarif action or the code-scanning API, deduplicating across runs using partialFingerprints. Limits: 20 runs per file, 25,000 results per run with the top 5,000 retained, 10 MB gzip-compressed.',
      },
      {
        term: 'NOLINT and its scope',
        definition: 'Inline suppression: NOLINT for the current line, NOLINTNEXTLINE for the following one, NOLINTBEGIN and NOLINTEND for a range, each optionally narrowed to a check glob such as NOLINT(bugprone-*). A bare NOLINT disables every check on that line, which is why suppressions should always name the check and carry a reason.',
      },
    ],
    approach: [
      'Start with warnings, because they are free: add -Wshadow -Wconversion -Wsign-conversion -Wnon-virtual-dtor -Wold-style-cast -Wformat=2 -Wdouble-promotion on top of -Wall -Wextra and see how large the backlog actually is',
      'Promote warnings to errors in the CI configuration only, using CMake COMPILE_WARNING_AS_ERROR on your own targets so third-party code compiled in the same tree is not affected',
      'Generate compile_commands.json with -DCMAKE_EXPORT_COMPILE_COMMANDS=ON and confirm clang-tidy parses a file cleanly before enabling any check — parse errors masquerading as findings are the fastest way to lose the team',
      'Check in a .clang-tidy with a deliberately narrow starting set (bugprone-*, clang-analyzer-*, performance-*, minus the specific checks you have measured as noisy) and a HeaderFilterRegex scoped to your source root',
      'Gate pull requests on changed lines only with clang-tidy-diff.py, and run the full repo nightly in report-only mode with a SARIF upload so the baseline is visible without blocking anyone',
      'Add clang-format with a checked-in .clang-format and enforce it separately with --dry-run --Werror, so review is about substance rather than whitespace, and reformat the repo in one commit recorded in .git-blame-ignore-revs',
      'Ratchet: each iteration, clear the backlog for one additional check group, then move it into the blocking set and into the nightly baseline, and repeat',
    ],
    pitfalls: [
      'Turning on a broad clang-tidy check set repo-wide as a blocking gate on day one — thousands of findings in untouched code, every pull request red for unrelated reasons, and the tool disabled within a week and never revisited',
      'Running clang-tidy without a compilation database, so it cannot find headers and emits parse errors that get reported as findings; the team concludes the tool is broken rather than misconfigured',
      'Leaving HeaderFilterRegex unset, which quietly suppresses findings in your own headers as well as in system ones — a header-heavy or template-heavy codebase is then effectively unanalyzed',
      'Suppressing a noisy check with bare NOLINT comments scattered through the source instead of disabling it in .clang-tidy; the real findings from that check are now hidden too and there is no record of the decision',
      'Running clang-tidy --fix or IWYU fix_includes.py across the repo unreviewed. Both produce changes that compile and are wrong — a modernize- fix can change overload resolution, and IWYU is unreliable on templates and macros',
      'Enabling -Werror for local developer builds, so the day someone upgrades their compiler every working tree fails to build on warnings that did not exist yesterday, in code nobody changed',
    ],
    keyQuestions: [
      {
        question: 'You are asked to turn on clang-tidy for a two-million-line legacy C++ codebase. Walk me through the rollout.',
        answer: `The failure mode I am designing against is well known: enable a broad check set repo-wide as a blocking gate, produce forty thousand findings, block every pull request for reasons unrelated to its change, and have the tool switched off within a week. The rollout is built to never reach that state.

Step one, make it parse. clang-tidy is a clang front end and needs the exact build flags:

  cmake -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
  clang-tidy -p build --checks=-*,readability-identifier-naming src/one_file.cc

Everything off except one trivial check. What I am verifying is that the file parses with zero errors. Missing headers, wrong standard version or an unknown target produce diagnostics that look like findings, and if the team's first exposure to the tool is a wall of parse errors, trust is gone before any real bug is found. Generated headers and non-clang toolchains are the usual complications here.

Step two, size the problem in report-only mode. Run the full repo with the candidate check set, non-blocking, and count findings per check:

  run-clang-tidy -p build -j$(nproc) -checks='-*,bugprone-*,clang-analyzer-*,performance-*' \\
    > tidy-full.log

Sort by check name. The distribution is always long-tailed: a handful of checks account for most findings, and inspecting twenty findings from each of the top checks tells you which are real and which are noise in this codebase specifically. Noise is codebase-dependent, which is why measuring beats copying someone else's config.

Step three, check in a narrow configuration. A .clang-tidy at the repo root:

  Checks: >
    -*,
    bugprone-*,
    clang-analyzer-*,
    performance-*,
    -bugprone-easily-swappable-parameters
  HeaderFilterRegex: '^src/.*'
  WarningsAsErrors: ''

Narrow by design. bugprone- and clang-analyzer- are the highest-signal groups; modernize- and readability- are large, stylistic and best deferred. HeaderFilterRegex scoped to src/ matters more than people expect — unset, findings from your own headers are suppressed along with system ones. WarningsAsErrors stays empty at this stage.

Step four, gate on the diff only. This is the whole trick:

  git diff -U0 origin/main | clang-tidy-diff.py -p1 -path build -j$(nproc)

Only lines the pull request touched are analyzed. New code is held to the standard, existing code is not a tax on whoever edits nearby. The backlog cannot grow, and it shrinks as files are naturally rewritten. GitHub code scanning gives the equivalent behaviour natively by only surfacing alerts on lines present in the diff.

Step five, run the full repo nightly, non-blocking, uploading SARIF so the trend is a visible chart rather than a log file. Publishing the number is what creates the pressure to reduce it without any individual being blocked.

Step six, ratchet. Every few weeks pick one additional check group, clear its existing findings as a dedicated cleanup change, then move it into the enforced set. Each group graduates once and never regresses. This is the difference between a rollout and a big-bang failure, and it is the part interviewers are actually listening for.

Two things I would say explicitly. Suppressions must name the check and carry a reason — NOLINTNEXTLINE(bugprone-branch-clone) with a comment, never a bare NOLINT — because a bare suppression disables every check on that line forever. And never run --fix unreviewed across the repo: modernize- fixes in particular can change overload resolution or lifetime behaviour in ways that compile cleanly and behave differently.`,
      },
      {
        question: 'Which warnings do -Wall and -Wextra not give you, and which ones do people wrongly disable?',
        answer: `The naming is the problem. -Wall sounds exhaustive and is not; it is a curated set from a long time ago covering constructions most people consider questionable — uninitialized use, unused variables and functions, format string mismatches at level 1, missing braces, return type problems, sequence points, switch handling. -Wextra adds another band: sign comparison, maybe-uninitialized, missing field initializers, unused parameters, type limits, implicit fallthrough at level 3.

What neither gives you:

  -Wshadow            a local or parameter shadows an outer name
  -Wconversion        implicit conversions that may alter a value
  -Wsign-conversion   implicit signed/unsigned conversions specifically
  -Wold-style-cast    C-style casts in C++
  -Wnon-virtual-dtor  polymorphic base class with a non-virtual destructor
  -Wdouble-promotion  implicit float to double promotion
  -Wformat=2          -Wall only enables -Wformat=1; level 2 adds security checks
  -Wuseless-cast      a cast to the type the expression already has
  -Wnull-dereference  exists, but only fires with optimization enabled

A reasonable starting set for new C++ code:

  -Wall -Wextra -Wshadow -Wnon-virtual-dtor -Wold-style-cast
  -Wcast-align -Wunused -Woverloaded-virtual -Wconversion
  -Wsign-conversion -Wdouble-promotion -Wformat=2

Clang additionally has -Weverything, which is genuinely everything including experimental and mutually contradictory checks. It is useful once, to discover which warnings exist, and is a mistake as a permanent setting because a compiler upgrade adds new warnings without warning you.

The ones people wrongly disable, in order of damage:

-Wnon-virtual-dtor. Deleting a derived object through a base pointer with a non-virtual destructor is undefined behaviour and the derived destructor simply does not run, so you get a silent leak or an unreleased handle rather than a crash. This warning is nearly false-positive-free and disabling it is indefensible.

-Wconversion and -Wsign-conversion. Extremely noisy on legacy code — a size_t compared against an int lights up everywhere — so they get turned off in bulk. That removes an entire bug class: silent narrowing, and signed-unsigned comparison that inverts the result of a bounds check. The right handling is per-directory enablement on new code, or fixing the underlying type discipline, not a global -Wno-.

-Wmaybe-uninitialized. This one has real false positives that vary by GCC version and optimization level, which makes disabling it defensible in a way the others are not. But it is usually disabled globally when it should be suppressed at the specific site with a pragma and a comment, because the true positives it finds are exactly the bugs that are hardest to reproduce.

-Wshadow. Trips on the common idiom of a constructor parameter named after the member it initializes. The right fix is a naming convention — trailing underscore on members — not removing the warning, because genuine shadowing in a long function is a real and hard-to-see bug.

-Wunused-parameter. Disabled because interface implementations legitimately ignore arguments. The correct response is to omit the parameter name or use [[maybe_unused]], both of which document the intent at the site.

The general principle worth stating: disable a warning at the narrowest scope that works. A pragma around one function beats a per-file flag, which beats a global -Wno-. And record why, because a -Wno- flag with no comment in a build file is permanent by default — nobody will ever feel confident removing it.`,
      },
      {
        question: 'Why -Werror in CI but not in local developer builds?',
        answer: `Because the two environments have different failure costs, and -Werror converts a warning into a hard stop.

The case for -Werror in CI is straightforward. Without it, warning count grows without bound. Nobody reads a build log with four hundred warnings, so the four hundred and first — the one that says a comparison is always true, or that this function returns without a value on some path — is invisible. -Werror is the only mechanism that reliably keeps the count at zero, and a zero-warning build is the precondition for warnings being useful at all. CI is also a controlled environment: you pin the compiler version and the flags, so the set of warnings that can fire is deterministic and changes only when you change it.

The case against -Werror locally is about who gets blocked and when.

Compiler upgrades. A developer installs a new GCC or updates Xcode and their working tree stops building — not because of anything they wrote, but because the new compiler diagnoses something the old one did not. Every developer on a slightly different toolchain has a slightly different build outcome, which is exactly the situation a build system exists to prevent. In CI the compiler is pinned, so the upgrade is a deliberate, staged change made by one person who fixes the fallout once.

Exploratory work. Commenting out a block to bisect a bug leaves an unused variable. Adding a parameter you have not wired up yet leaves an unused parameter. These should produce a warning and a working binary, not a failed build. Forcing a developer to fix warnings in code they are about to delete converts a five-second experiment into a minute of yak-shaving, and the reliable outcome is that they add -Wno-error to their local flags permanently.

Third-party code in the tree. A vendored dependency compiled as part of your build will warn under your flag set. Global -Werror breaks the build on code you do not own and cannot fix. CMake's target-scoped property handles this correctly:

  set_target_properties(my_lib my_app PROPERTIES
    COMPILE_WARNING_AS_ERROR ON)

which applies to your targets and not to imported or third-party ones. CMake also provides --compile-no-warning-as-error at configure time, so a developer can turn it off locally without editing anything checked in.

The idiomatic implementation, then, is one of:

  cmake -B build -DCMAKE_BUILD_TYPE=Release            # local, warnings only
  cmake -B build -DCI=ON                               # CI, sets the property

or the older explicit form where CI passes -Werror through CMAKE_CXX_FLAGS and local builds do not.

Two refinements worth mentioning if pushed. First, -Wno-error=<specific> lets you keep -Werror on globally while demoting one newly-added warning to a plain warning during a migration — that is how you land a compiler upgrade without a flag day. Second, gate the merge rather than the build where your tooling allows it: a warning is a review comment, not necessarily a broken build, and some teams get better results treating it that way. But the default answer stands: -Werror in CI, plain warnings locally, compiler pinned in CI so the two never diverge unexpectedly.`,
      },
      {
        question: 'Describe a false-positive triage workflow. What do you do with a check that is 40 percent false positives?',
        answer: `Triage is a decision procedure, and the important part is that the decision is recorded somewhere durable rather than made again by each person who encounters the finding.

The workflow per finding:

Read the finding and the code, and classify into one of four outcomes. True positive and a real bug: fix it, and if it is a bug class, search for the pattern elsewhere. True positive but harmless in this context — dead code, a defensive check the tool cannot prove is unreachable: fix it anyway if cheap, because the next reader will have the same doubt. False positive from a tool limitation, typically an alias the analyzer cannot rule out or a cross-translation-unit invariant it cannot see: suppress narrowly with the check named and a comment explaining why. Systematically wrong for this codebase: this is not a per-site decision at all, and jumping to suppression here is the mistake.

Suppression discipline. A suppression names the check and carries a reason:

  // NOLINTNEXTLINE(clang-analyzer-core.NullDereference)
  // p is guaranteed non-null by the registry invariant checked in init().
  return p->value();

A bare NOLINT disables every check on that line forever, including checks that do not exist yet. Whatever the tool, the review rule is the same: a suppression with no reason does not merit approval.

Now the specific question: a check that is 40 percent false positives.

Disable it, at the configuration level, with a comment. Not because 40 percent is a magic threshold, but because of what happens if you do not. At that rate, developers stop reading findings from the tool as a whole — they learn the output is unreliable and start dismissing everything, including the 60 percent that were real. A noisy check does not merely waste time on itself; it degrades the credibility of every other check running alongside it.

  Checks: >
    -*,
    bugprone-*,
    -bugprone-easily-swappable-parameters,
    clang-analyzer-*

with a comment in the file recording the measurement and the date. The measurement matters: "we sampled 50 findings in March 2026 and 20 were wrong" is a reviewable claim, and it gives a future maintainer grounds to re-enable after a tool upgrade.

The alternative you must reject explicitly, because it is what teams actually do: keeping the check on and papering over it with NOLINT at every false-positive site. That suppresses the 60 percent of true positives that land on the same lines, buries the decision in hundreds of places instead of one, and leaves no way to reassess.

Before disabling, two things are worth trying. Many checks have CheckOptions that change their behaviour — a size threshold, an ignored-types list, a strictness toggle — and tuning can move a check from 40 percent noise to acceptable. And confirm the noise is not a configuration artifact: an unset HeaderFilterRegex, a wrong standard version, or a stale compilation database all produce findings that look like false positives but are really parse problems.

Finally, the tooling that makes this scale. Inline NOLINT does not work for a full-repo baseline of thousands of pre-existing findings — you cannot annotate them all. That is what a results database is for: CodeChecker for clang tooling, or the triage store built into Coverity and PVS-Studio, which fingerprints each finding, remembers the disposition, and shows you only what is new since the last run. GitHub code scanning does the same thing with SARIF partialFingerprints and a dismiss-with-reason workflow. The property you want in all of them is that a decision made once survives refactoring of surrounding code.`,
      },
      {
        question: 'clang-tidy, the clang static analyzer, cppcheck, and Coverity — what does each actually do differently?',
        answer: `They differ along two axes: how deeply they reason about program state, and how far they reason across boundaries.

clang-tidy — AST matching. It builds the same syntax tree the compiler does and matches structural patterns against it. A check like bugprone-use-after-move finds a use of a moved-from object by matching the shape of the code, not by simulating execution. That makes it fast, mostly local, and excellent at known-shape defects and modernization. Several hundred checks across bugprone-, cert-, cppcoreguidelines-, modernize-, performance-, readability- and more. It needs compile_commands.json because it really parses your code. It also embeds the static analyzer's checks under the clang-analyzer- prefix, which is why a full clang-tidy run costs more than pure AST matching would suggest. What it cannot do: reason about which paths are feasible, or see across translation units.

Clang static analyzer — symbolic execution. It walks paths through a function maintaining a symbolic state: this pointer may be null on this branch, this value is constrained to be positive here. That is how it finds a null dereference that only occurs when the first condition is true and the second is false — a defect with no distinguishing syntactic shape at all. Driven by scan-build, which overrides CC and CXX with a wrapper that runs the real compiler and the analyzer together, writes linked HTML reports showing the exact path to each bug, and exits nonzero with --status-bugs. clang --analyze runs it on a single translation unit and can emit SARIF. Its limit is scope: intraprocedural with limited inlining, so a function that is safe only because of what its caller guarantees produces a false positive, and a bug that requires crossing a translation unit boundary is invisible.

cppcheck — independent engine. A separate implementation with its own value-flow analysis, no shared lineage with clang, and therefore a different false-positive profile. Its practical value is exactly that independence: it finds things clang tooling misses and vice versa. It does not strictly require a compilation database, though --project=compile_commands.json makes it substantially more accurate; --enable= selects categories, --error-exitcode integrates with CI, it has file and inline suppression, and a MISRA addon. Cheap enough to run alongside clang-tidy rather than instead of it.

Coverity and the commercial tier — whole-program interprocedural. This is the real technical differentiator, not marketing. They build a model of the entire program and reason across translation unit boundaries: a taint introduced by a parser in one file, passed through three layers, and dereferenced in another compilation unit is exactly the defect the open source tools structurally cannot find, because none of them see more than one TU at a time. Alongside that you buy certified rule packs for MISRA C, MISRA C++, AUTOSAR C++14 and CERT with the traceability matrices a functional safety audit under ISO 26262 or DO-178C requires, and a triage database that fingerprints findings and remembers dispositions across releases so last year's dismissal does not resurface. Coverity Scan is free for open source projects, which is how many people first encounter it. The costs are licence fees, scans that take hours and therefore cannot gate a pull request, and false positives of their own — depth is not accuracy.

How they compose in a real pipeline: compiler warnings on every build; clang-tidy diff-scoped on every pull request; cppcheck alongside it because it is nearly free and independent; the static analyzer and the commercial scan nightly or weekly, non-blocking, feeding a SARIF-based dashboard.

The framing I would close on: these tools sit on a curve of depth against speed. Warnings are instant and shallow. AST matching is seconds per file and structural. Path-sensitive analysis is minutes and reasons about feasibility within a function. Whole-program analysis is hours and reasons across the entire codebase. You run each at the cadence its cost allows, and the deepest tool is not the one you gate on.`,
      },
    ],
    references: [
      'https://clang.llvm.org/extra/clang-tidy/',
      'https://clang.llvm.org/docs/analyzer/user-docs/CommandLineUsage.html',
      'https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html',
      'https://include-what-you-use.org/',
      'https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 19. Python for Build Automation
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-python-build-automation',
    title: 'Python for Build Automation',
    icon: 'code',
    color: '#ea580c',
    questions: 5,
    description: 'Python as the language you write build tooling in, not web apps. Replacing untestable YAML and shell with a packaged, unit-tested CLI that every build agent runs at a pinned version.',
    visualizations: [
      {
        title: 'From YAML sprawl to a packaged, tested build CLI',
        image: '/diagrams/devops/nb-19-python-build-automation.png',
        description: `Most build systems decay the same way. A pipeline starts as thirty lines of YAML. Someone needs a conditional, so a shell one-liner appears. Someone needs to parse a version out of a file, so an awk pipeline appears. Two years later the pipeline is 1,400 lines of YAML containing 300 lines of embedded bash, none of which can be run locally, none of which has a test, and all of which fails only in CI, ten minutes into a build.

The core argument for Python is short: YAML has no unit tests. Shell has no unit tests that anyone actually writes. Python does. When release logic lives in a Python package you can run it on a laptop, run it under pytest, type-check it with mypy, and pin the exact version every agent uses. The YAML shrinks back to what it is good at — declaring triggers, agents, and one command per step.

What the diagram shows is that migration. On the left the pipeline owns the logic: interpolated variables, inline bash, copy-pasted blocks across three pipeline files. On the right the pipeline owns only orchestration, and a package named something like buildtool owns the logic. Each CI step becomes a single invocation: buildtool release --channel beta. The pipeline is now readable by someone who has never seen the repository.

The subprocess layer is where most homegrown Python build tooling is wrong. The correct default is a list of arguments, no shell, an explicit check, captured output, and a timeout:

\`\`\`python
import subprocess

def run(cmd: list[str], cwd=None, timeout: float = 600) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd, cwd=cwd, check=True, capture_output=True,
        text=True, timeout=timeout,
    )
\`\`\`

subprocess.run with shell=False, which is the default, hands the argument vector straight to the operating system, so shell metacharacters in a branch name or a tag cannot inject a command. The Python documentation is explicit that when the shell is invoked via shell=True it becomes the application's responsibility to quote all whitespace and metacharacters to avoid shell injection. check=True raises CalledProcessError, whose returncode, cmd, stdout, and stderr attributes give you a usable error message. timeout kills the child, waits for it, and re-raises TimeoutExpired — which is what saves a build agent from a hung linker holding a runner for six hours.

The one thing capture_output costs you is live output. For a long compile you want the log streaming, so use Popen with stdout=PIPE and stderr=STDOUT and iterate the lines, logging each. Whichever form you use, propagate the exit code. Build tooling that swallows a non-zero exit and returns 0 is how a broken artifact reaches a release channel.

Path handling is the second common defect. os.path.join plus string concatenation produces code that is wrong on Windows agents and unreadable everywhere. pathlib gives you the / operator, .mkdir(parents=True, exist_ok=True), .resolve(), .rglob('*.o'), .read_text(), .write_text(), and .relative_to() for building archive-relative paths. A build tool that must work on Linux, macOS, and Windows agents should contain essentially no string path arithmetic.

Output is the third. print writes to stdout with buffering that CI log collectors interleave badly against subprocess output, and it carries no level, no timestamp, and no logger name. logging.getLogger(__name__) plus a single logging.basicConfig at the entry point gives you levels, a consistent format, and the ability to send diagnostics to stderr while keeping stdout clean for machine-readable output. logging.exception inside an except block records the traceback, which is what you actually want in a failed build log.

Packaging is what makes the tooling reproducible. A pyproject.toml with a [project] table and a [project.scripts] entry point turns the package into a real command on PATH. A lockfile — uv.lock, or a fully hashed requirements file installed with --require-hashes — means agent A and agent B run byte-identical tooling. Without that pin the build tool is itself an unversioned dependency of your build, and "it worked yesterday" becomes an unanswerable question.

Testing closes the loop. pytest with tmp_path gives each test a clean directory; monkeypatch.setenv and monkeypatch.chdir isolate environment assumptions and undo them at teardown; unittest.mock.patch on your run() wrapper lets you assert the exact argument vector a command would have received without executing anything. That is the test that catches a quoting regression before it ships.`,
      },
      {
        title: 'Quick-fire interview answers — Python build tooling',
        description: `Q: Why move build logic out of YAML into Python?
A: Because YAML has no unit tests, no local execution path, and no type checking, so every change is validated only by running the pipeline. Python build tooling runs on a laptop, is tested with pytest, checked with mypy, and pinned by version so every agent runs the same code. The YAML shrinks to triggers and one command per step, which is what declarative config is actually good at.

Q: What is wrong with subprocess.run("make -j8 && ./deploy.sh", shell=True)?
A: Three things. It invokes a shell, so any interpolated value — a branch name, a tag, a user-supplied argument — can inject commands. It has no check=True, so a failing make is silently ignored. It has no timeout, so a hung child holds the agent indefinitely. The correct form is a list of arguments, shell=False, check=True, captured or streamed output, and an explicit timeout.

Q: How do you propagate a subprocess failure out of a build script correctly?
A: Either let check=True raise CalledProcessError and handle it at the top level, or capture the CompletedProcess and call sys.exit on its returncode. What you must not do is log the error and return normally — CI reads the process exit code, not your log, so a swallowed failure produces a green build on a broken artifact.

Q: How do you make sure every build agent runs the same version of your build tooling?
A: Package it with pyproject.toml and a [project.scripts] entry point, publish it to an internal index, and install from a lockfile — uv.lock via uv sync --frozen, or a hash-pinned requirements file installed with pip install --require-hashes. Installing from a branch, or pip install -e on the agent, lets the tooling version drift per agent and failures stop being reproducible.

Q: How do you unit test a function that shells out?
A: Wrap every subprocess call in one thin run() helper, then patch that helper in tests and assert on the exact argument list it received. For filesystem work use the pytest tmp_path fixture so each test gets an isolated directory, and monkeypatch.setenv for environment assumptions. You are testing your own decision logic — which flags get built, in what order — not whether the compiler works.

Q: How do you generate a CI matrix programmatically?
A: Have a Python command emit JSON on stdout, publish it as a job output, and have the downstream job consume it. In GitHub Actions that means appending to the file named by the GITHUB_OUTPUT environment variable, declaring it under the job outputs, and expanding it with fromJSON in the matrix. The matrix is then derived from what actually changed rather than hand-maintained in YAML.`,
      },
    ],
    introduction: `The job description leads with advanced Python used to automate workflows and enhance build processes. That is a specific dialect of Python, and it is not the one most candidates prepare. Nobody is asking about web frameworks or dataframes. They are asking whether you can write the tool that builds, tests, signs, and publishes the product — and whether that tool is something a team can maintain for five years.

The problem it solves is the decay of declarative pipelines. Every CI system starts you in YAML, and YAML is genuinely good at declaring triggers, agents, and dependencies between jobs. It is terrible at logic. The moment you need a conditional, a loop, a version parse, or a retry, the YAML grows an embedded shell script, and that script has no tests, cannot be run locally, and fails only in CI. Multiply by three pipeline files and two years, and the build system becomes a thing nobody will touch.

Moving that logic into a Python package inverts the situation. The pipeline calls one command per step. The command is a real CLI with argparse or click, so it is discoverable and has a help output. It is packaged with pyproject.toml and a console entry point, so it installs and runs identically on a laptop and on every agent. It is pinned by a lockfile, so "the build tool changed under us" stops being a class of incident. And it is tested with pytest, so changing release logic becomes a normal code change with a normal review.

The mechanics interviewers actually probe are narrow and specific. subprocess done correctly — list arguments rather than shell=True, check=True, captured or streamed output, a timeout, and an exit code that propagates. pathlib rather than os.path string arithmetic, because build tooling runs on Windows agents too. logging rather than print, because CI log collectors need levels and stderr separation and because print buffering reorders your output against child process output. Typing plus mypy, because tooling code is the code most likely to be edited by someone who did not write it.

Where it fits is alongside, not instead of, the build system. Python does not replace Make, CMake, MSBuild, or Bazel — those own dependency graphs and incremental rebuild, and reimplementing a dependency graph in Python is how you lose incremental builds and double your build times. Python owns the orchestration layer above them: deciding what to build, assembling the flags, fanning out a matrix, collecting artifacts, running the signing and publishing steps, and turning a failure into a message a human can act on.

The failure mode to name out loud is the one every mature organisation has lived through: the build tooling becomes an untested monolith that only one person understands, and that person leaves. Untested Python is not better than untested bash — it is bash with more line noise and a dependency resolver. The value comes entirely from the discipline around it: packaged, pinned, typed, and tested.`,
    whenToUse: [
      'Any CI step whose YAML has grown embedded shell with conditionals, loops, or string parsing',
      'Cross-platform build orchestration where the same logic must run on Linux, macOS, and Windows agents',
      'Generating CI matrices or job graphs from repository state rather than hand-maintaining them in YAML',
      'Release automation — version bumping, changelog assembly, artifact collection, signing, and publishing',
      'Wrapping a legacy build system so callers get one stable CLI while the internals are migrated underneath',
    ],
    keyConcepts: [
      {
        term: 'subprocess.run with a list',
        definition: 'subprocess.run(args, check=..., capture_output=..., text=..., timeout=...). Passing a list with the default shell=False sends the argument vector straight to the operating system, so shell metacharacters in interpolated values cannot inject commands. check=True raises CalledProcessError carrying returncode, cmd, stdout, and stderr.',
      },
      {
        term: 'shell=True',
        definition: 'Runs the command through the system shell. The Python docs state that when the shell is invoked explicitly it is the application responsibility to quote all whitespace and metacharacters to avoid shell injection. In build tooling it is almost never needed — pipelines and redirection can be expressed with Popen objects instead.',
      },
      {
        term: 'timeout and TimeoutExpired',
        definition: 'subprocess.run(timeout=N) kills the child, waits for it, and re-raises TimeoutExpired. Without it a hung compiler, a stalled fetch, or a tool waiting on stdin holds a build agent until the CI-level job timeout, which is usually far longer than you want.',
      },
      {
        term: 'pathlib.Path',
        definition: 'Object-oriented paths: the / join operator, .mkdir(parents=True, exist_ok=True), .resolve(), .glob and .rglob, .read_text and .write_text, .relative_to. Replaces os.path string arithmetic, which is the usual reason a build script works on Linux and breaks on a Windows agent.',
      },
      {
        term: 'Console entry point',
        definition: 'A [project.scripts] table in pyproject.toml mapping a command name to a module and function. Installing the package puts a real executable on PATH, so CI runs buildtool release rather than python tools/scripts/release_v2_final.py — which also stops the repository layout being encoded into every pipeline.',
      },
      {
        term: 'Lockfile pinning',
        definition: 'uv.lock consumed with uv sync --frozen, or a fully hashed requirements file installed with pip install --require-hashes. Guarantees every agent resolves an identical dependency set. Declared version ranges are not pinning — they resolve to whatever was published this morning.',
      },
      {
        term: 'tmp_path and monkeypatch',
        definition: 'pytest fixtures. tmp_path gives each test its own directory so filesystem tests do not collide; monkeypatch.setenv, .setattr, and .chdir isolate environment and working-directory assumptions and undo both automatically at teardown.',
      },
    ],
    approach: [
      'Inventory the embedded logic: grep the pipeline files for script blocks longer than three lines — those are the candidates to extract first',
      'Create one package with pyproject.toml, a [project.scripts] entry point, and a single run() subprocess wrapper that every command uses',
      'Port one pipeline step at a time, leaving the old YAML step in place until the new command is proven, so each move is independently revertable',
      'Add pytest coverage for the decision logic — which flags, which order, which artifacts — by patching the run() wrapper and asserting on the argument vector',
      'Turn on mypy for the package with disallow_untyped_defs at minimum, and run it in the same CI job as the tests',
      'Pin the tooling with a lockfile and install it in CI from that lockfile, publishing to an internal index rather than installing from a branch',
    ],
    pitfalls: [
      'shell=True with an interpolated branch name, tag, or pull request title — a branch named with a semicolon becomes command execution on the agent',
      'Calling subprocess without check=True and without inspecting returncode, so a failed compile produces a green build and an empty artifact',
      'No timeout anywhere, so one hung child process holds a build agent until the CI job limit and starves the queue',
      'Using print for CI output — buffering reorders it against subprocess output, and there is no level to filter on when the log is 40,000 lines',
      'Build tooling with zero tests: it becomes an untested monolith that only its author understands, which is bash with extra syntax',
      'Installing tooling unpinned, so a transitive dependency release silently changes build behaviour overnight with no commit to point at',
    ],
    keyQuestions: [
      {
        question: 'Make the case for replacing pipeline YAML and shell with Python. What is the actual argument, and where does it stop?',
        answer: `The argument in one line: YAML has no unit tests, and neither does the shell embedded in it.

Concretely, here is what you lose when release logic lives in a pipeline file. You cannot run it locally, so the edit-test loop is a git push and a ten-minute wait. You cannot test it, so every change is validated only by production. You cannot type-check it. You cannot reuse it across three pipeline definitions without copy-paste, and copy-paste means the three copies drift. Errors surface as a shell exit code with no context, because the failure happened four pipes deep in a one-liner. And the whole thing is invisible to code review — a diff of 40 lines of YAML with embedded bash gets approved by reflex.

Moving that into a Python package changes each of those. It runs locally. It has pytest coverage on the decision logic. mypy checks it. It is one implementation called from three pipelines. Failures raise typed exceptions with messages. And a pull request against it looks like normal code, so it gets a normal review.

The structure that works:

\`\`\`
buildtool/
  pyproject.toml         # [project.scripts] buildtool = "buildtool.cli:main"
  src/buildtool/
    cli.py               # argparse or click, subcommands only
    proc.py              # the single run() wrapper
    compile.py
    package.py
    release.py
  tests/
    test_release.py      # patches proc.run, asserts on the argument vector
\`\`\`

And the pipeline step collapses to:

\`\`\`yaml
- script:
    - uv sync --frozen
    - uv run buildtool release --channel beta
\`\`\`

Where it stops matters as much as where it starts, and saying so is what separates a senior answer from a zealous one.

It does not replace the build system. Make, CMake, MSBuild, Ninja, and Bazel own the dependency graph and incremental rebuild. Python calls them; it does not reimplement them. Rewriting a dependency graph in Python is how you lose incremental builds and double your build times.

It does not replace the declarative parts of CI. Triggers, agent selection, job dependencies, concurrency groups, environment protection rules — those belong in YAML, because the CI system needs to read them before any code runs. A pipeline that is one giant step calling one Python command gives up parallelism, per-step caching, and the CI system's own retry semantics.

It is not free. You now have a package to version, pin, test, and publish. For a repository with a twelve-line pipeline that is pure overhead. The threshold is roughly: once the same logic appears in more than one pipeline, or once a single script block exceeds a screen, extraction pays for itself.

The wrong answer sounds like "we scripted everything in Python" with no mention of tests or pinning. Untested Python invoked from CI is exactly as fragile as the bash it replaced.`,
      },
      {
        question: 'Write the subprocess call you would actually ship in build tooling, and explain every argument.',
        answer: `One wrapper, used everywhere, so the policy is enforced in one place:

\`\`\`python
from __future__ import annotations
import logging, subprocess
from pathlib import Path

log = logging.getLogger(__name__)

class CommandError(RuntimeError):
    def __init__(self, cmd: list[str], returncode: int, stderr: str):
        self.cmd, self.returncode, self.stderr = cmd, returncode, stderr
        super().__init__(f"{cmd[0]} failed with exit {returncode}")

def run(cmd: list[str], *, cwd: Path | None = None,
        timeout: float = 900, env: dict[str, str] | None = None) -> str:
    log.info("run: %s", " ".join(cmd))
    try:
        proc = subprocess.run(
            cmd, cwd=cwd, env=env,
            check=True, capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.CalledProcessError as exc:
        log.error("exit %s from %s\\n%s", exc.returncode, cmd[0], exc.stderr)
        raise CommandError(cmd, exc.returncode, exc.stderr) from exc
    except subprocess.TimeoutExpired as exc:
        log.error("timeout after %ss: %s", exc.timeout, " ".join(cmd))
        raise
    return proc.stdout
\`\`\`

Argument by argument.

cmd as a list, not a string. With the default shell=False the list is passed to the operating system as an argument vector, so a tag named "v1.0; rm -rf /" is one literal argument. This is the single most important line. The subprocess docs are explicit that with shell=True it becomes your responsibility to quote every metacharacter, and nobody does that correctly under deadline.

check=True. Raises CalledProcessError on any non-zero exit. The exception carries returncode, cmd, output or stdout, and stderr, which is what makes the log message useful. Without check you must remember to inspect returncode at every call site, and one forgotten check is a silent green build on a broken artifact.

capture_output=True with text=True. capture_output sets both stdout and stderr to PIPE; text decodes them as strings rather than bytes. Note the tradeoff: capturing means nothing streams to the log until the process exits. For a twenty-minute compile you want the opposite.

timeout. On expiry the child is killed, waited for, and TimeoutExpired is re-raised. This is the difference between one bad build and an agent pool starved for six hours. Set it per command class — a compile gets 30 minutes, an artifact upload gets 5.

cwd rather than os.chdir. Changing the process working directory is global mutable state; two parallel operations in the same process corrupt each other. Pass cwd per call.

env explicitly when it matters, and carefully. Passing env replaces the entire environment, so build from a copy of os.environ and overlay your keys. A bare env with only PATH strips everything the toolchain needs and produces a baffling failure.

For a long-running command you want streaming instead:

\`\`\`python
def run_streaming(cmd: list[str], *, cwd: Path | None = None) -> int:
    with subprocess.Popen(
        cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, bufsize=1,
    ) as proc:
        assert proc.stdout is not None
        for line in proc.stdout:
            log.info("%s", line.rstrip())
    return proc.returncode
\`\`\`

Merging stderr into stdout with stderr=STDOUT keeps compiler warnings interleaved in emission order, which is what you want when reading a build log. bufsize=1 with text=True gives line buffering so output appears as it happens rather than in one block at the end.

Finally, propagate. The top-level entry point should exit non-zero on failure, either by calling sys.exit with the child's return code or by letting the exception escape. CI reads the exit code; it does not read your log.`,
      },
      {
        question: 'How do you unit test build tooling? Give the fixtures and a concrete test.',
        answer: `The insight that makes this tractable: you are not testing the compiler, the signer, or the registry. You are testing your own decision logic — which command gets built, with which flags, in which order, under which conditions. That is pure logic, and it is testable if every external call goes through one seam.

The seam is the run() wrapper. Patch it and you control everything.

\`\`\`python
# tests/test_release.py
import pytest
from buildtool import release

def test_release_pins_the_tag_and_skips_upload_on_dry_run(monkeypatch, tmp_path):
    calls: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return ""

    monkeypatch.setattr(release, "run", fake_run)
    monkeypatch.setenv("CI", "true")

    (tmp_path / "VERSION").write_text("2.4.1\\n")
    monkeypatch.chdir(tmp_path)

    release.publish(channel="beta", dry_run=True)

    assert ["git", "tag", "-a", "v2.4.1-beta", "-m", "release 2.4.1-beta"] in calls
    assert not any(c[:2] == ["aws", "s3"] for c in calls), "dry run must not upload"
\`\`\`

The fixtures doing the work.

tmp_path gives this test its own directory, so writing VERSION cannot affect any other test, and pytest cleans it up afterwards. Use tmp_path_factory when several tests share one expensive fixture directory.

monkeypatch.setattr swaps the run wrapper for a recorder. Because the wrapper is a module-level name in release.py, patching release.run is what the code under test resolves. Patching subprocess.run instead would work but tests a lower layer than you care about.

monkeypatch.setenv and monkeypatch.chdir set environment and working directory and — importantly — undo both at teardown. A hand-rolled os.chdir in a test leaks into every subsequent test in the session and produces failures that depend on test ordering.

capsys captures stdout and stderr when you need to assert on human-facing output, though for logging you generally want caplog instead.

Parametrise the matrix cases rather than writing five near-identical tests:

\`\`\`python
@pytest.mark.parametrize(
    "channel,expected_flag",
    [("beta", "--pre"), ("stable", "--release"), ("nightly", "--pre")],
)
def test_channel_maps_to_flag(monkeypatch, channel, expected_flag):
    ...
\`\`\`

Assert on failures, not just successes. The test that a non-zero exit actually raises is the one that catches a regression where somebody removed check=True:

\`\`\`python
def test_compile_failure_propagates(monkeypatch):
    def boom(cmd, **kw):
        raise CommandError(cmd, 2, "ld: symbol not found")
    monkeypatch.setattr(build, "run", boom)
    with pytest.raises(CommandError) as exc:
        build.compile_all()
    assert exc.value.returncode == 2
\`\`\`

Put shared fixtures in conftest.py and keep the tests fast enough to run on every commit. Then add exactly one slow integration test that shells out to a trivial real command, so the wrapper itself is covered end to end. The unit tests catch logic regressions; the single integration test catches the day someone breaks the wrapper's own argument handling.`,
      },
      {
        question: 'How do you package and pin build tooling so every agent runs the identical version?',
        answer: `The failure this prevents is specific: two agents produce different artifacts from the same commit because they resolved different tooling dependencies. It is one of the harder build incidents to diagnose, because the repository is identical and only the machine differs.

Step one, make it a package. pyproject.toml with a build backend, a project table, and a console entry point:

\`\`\`toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "buildtool"
version = "3.2.0"
requires-python = ">=3.11"
dependencies = ["click>=8.1,<9", "packaging>=24"]

[project.scripts]
buildtool = "buildtool.cli:main"

[tool.mypy]
python_version = "3.11"
disallow_untyped_defs = true
warn_return_any = true
\`\`\`

The [project.scripts] table is what turns this into a command. After install, buildtool is on PATH. The CI step becomes buildtool release --channel beta instead of python tools/ci/release_final_v2.py, which matters more than it sounds: the script-path form encodes a repository layout into every pipeline, so moving the file breaks CI in three places.

Step two, lock it. Declared ranges are not pinning — a dependency declared as click>=8.1,<9 resolves to whatever click published this morning. You need a resolved, hashed set:

\`\`\`bash
uv lock                 # writes uv.lock with exact versions and hashes
uv sync --frozen        # CI: install exactly the lock, fail if it drifted
uv run buildtool ...    # run inside that environment
\`\`\`

--frozen is the important flag. It refuses to update the lockfile, so a CI run either matches the committed lock or fails loudly. Without it a drifted lock is silently rewritten and the agent runs something the repository never recorded.

The pip equivalent is a compiled, hashed requirements file:

\`\`\`bash
pip install --require-hashes -r requirements.lock
\`\`\`

--require-hashes makes pip refuse any dependency without a matching hash, which also closes the door on an index serving different bytes under the same version number.

Step three, publish and consume by version. Push the wheel to an internal index and have the pipeline install a pinned version rather than installing from the repository checkout. This decouples "the tooling changed" from "the product changed" — you can roll the tooling back independently, and the tooling version appears in the build log. Installing with pip install -e from the working tree on every agent is convenient in development and wrong in CI, because the installed version is then whatever the branch happened to contain.

Step four, pin the interpreter too. requires-python is a constraint, not a pin. If some agents run 3.11 and others 3.13, you have two behaviours and eventually two bugs. Either pin the container image, or provision a known interpreter explicitly.

The check that proves it works: run the same commit on two agents and diff the tooling's own version output and the resolved dependency list. If those match and the artifacts still differ, the non-determinism is in the build itself rather than the tooling — which is a much more useful place to be standing.`,
      },
      {
        question: 'You need a CI matrix that depends on what changed. How do you generate it programmatically, and what breaks?',
        answer: `Hand-maintained matrices rot. Twenty entries, three of them for platforms nobody ships anymore, and one missing because whoever added the new target forgot the second pipeline file. Deriving the matrix from repository state fixes the rot and cuts build minutes, because you stop building targets nothing touched.

The pattern is two jobs. The first emits JSON; the second consumes it as its matrix.

\`\`\`python
# buildtool/matrix.py
import json, os, sys
from pathlib import Path

PLATFORMS = ("linux-x64", "linux-arm64", "windows-x64")
MAX_JOBS = 40

def emit() -> None:
    changed = {Path(p).parts[0] for p in sys.stdin.read().splitlines() if p}
    targets = [
        {"component": comp.name, "platform": plat}
        for comp in sorted(Path("components").iterdir())
        if comp.name in changed
        for plat in PLATFORMS
    ]
    if len(targets) > MAX_JOBS:
        raise SystemExit(f"matrix would be {len(targets)} jobs, cap is {MAX_JOBS}")
    payload = json.dumps({"include": targets})
    json.loads(payload)          # validate our own output before publishing it
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as fh:
        fh.write(f"matrix={payload}\\n")
        fh.write(f"has_work={'true' if targets else 'false'}\\n")
\`\`\`

Appending to the file named by the GITHUB_OUTPUT environment variable is the current mechanism; the older workflow-command form of setting outputs is deprecated. The consuming side declares the output and expands it:

\`\`\`yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      matrix: \${{ steps.gen.outputs.matrix }}
      has_work: \${{ steps.gen.outputs.has_work }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: gen
        run: git diff --name-only origin/main... | uv run buildtool matrix

  build:
    needs: plan
    if: needs.plan.outputs.has_work == 'true'
    strategy:
      matrix: \${{ fromJSON(needs.plan.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - run: uv run buildtool compile --component \${{ matrix.component }}
\`\`\`

Now the things that break, which is what the interviewer is actually after.

The empty matrix. If nothing changed, the include list is empty and most CI systems either error or silently skip the job — and a skipped required check can block a merge forever. Emit a separate has_work output and gate the downstream job on it, rather than relying on the matrix being non-empty.

Silent JSON malformation. The generator writes a string and the CI system parses it. A stray newline or an unescaped quote produces a parse error twelve lines into a YAML expression with a useless message. Validate with json.loads on your own output before writing it, and unit test the generator's output shape.

Fan-out explosion. A generated matrix has no natural ceiling. Three components times four platforms times three toolchain versions is 36 jobs from a one-line change to a shared header. Cap it explicitly and fail the plan job with a clear message rather than launching four hundred runners.

Wrong diff base. The diff depends on the merge base existing locally. With a shallow clone — which is the default in several CI systems — the merge base is absent and the diff returns everything or nothing. Set the fetch depth explicitly, and make a missing base a loud failure rather than defaulting to building nothing.

Dependency blindness. Path-based change detection misses that component A depends on component B. Either read the real dependency graph from your build system and expand the closure, or restrict change-detection to leaf components and accept the risk explicitly. This is the failure that ships a broken artifact, and it is the one worth naming unprompted.

Cache and skip interaction. Skipping unchanged targets means their artifacts must come from somewhere. If a release step assembles all components, it needs a defined source for the ones that were not rebuilt — a promoted artifact from a previous run — or the release quietly ships with files missing.`,
      },
    ],
    references: [
      'https://docs.python.org/3/library/subprocess.html',
      'https://docs.python.org/3/library/pathlib.html',
      'https://docs.python.org/3/library/argparse.html',
      'https://docs.python.org/3/library/logging.html',
      'https://packaging.python.org/en/latest/guides/writing-pyproject-toml/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 20. Perl and PowerShell
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-perl-powershell',
    title: 'Perl and PowerShell for Build Automation',
    icon: 'terminal',
    color: '#ea580c',
    questions: 6,
    description: 'The two languages mature build systems actually run on. Reading and maintaining legacy Perl without rewriting it, and writing PowerShell that fails loudly instead of silently on Windows agents.',
    visualizations: [
      {
        title: 'Legacy Perl on Unix agents, PowerShell on Windows agents',
        image: '/diagrams/devops/nb-20-perl-powershell.png',
        description: `These two languages sit at opposite ends of a build organisation. Perl is what the build system was written in fifteen years ago and still runs on. PowerShell is what drives every Windows agent in it. Neither is fashionable, both are load-bearing, and a job description that names both is describing a real build system rather than a greenfield one.

Perl earned its place for three reasons that have not gone away. Its regular expression engine is still the reference implementation everyone else copied. Text munging — parsing compiler output, rewriting manifests, extracting versions — is the language's native register. And it is present on every Unix system by default, which mattered enormously when installing a language runtime on a build machine required a ticket.

The constructs you will actually meet when you open a 4,000-line legacy build script are a small set. Lexical variables with my, package globals with our, dynamic scoping with local. References, and the two ways to dereference them: the arrow form and the older circumfix form, which you will find mixed in the same file. Hashes of arrays, which is how Perl code represents targets and their flags. Regular expressions with captures feeding directly into a list assignment. Here-documents, where the quoting of the terminator decides interpolation — a double-quoted terminator interpolates, a single-quoted one does not, which is why a here-document emitting a Makefile is almost always the single-quoted form. Then @ARGV for arguments, Getopt::Long for real option parsing, and File::Find for directory walks.

The command execution surface is where legacy Perl bites. system with a list forks and waits, and returns the wait status rather than the exit code. The documented rule is that you shift right by eight to get the actual exit value, and a return of -1 means the program failed to start or the wait call itself errored, with the reason available in the error variable. Backticks and qx capture standard output instead. open with a trailing or leading pipe gives you a filehandle onto a child process. And critically, the single-argument form of system is checked for shell metacharacters and handed to the shell if any are present, whereas the list form is not — the same shell-injection distinction Python has, expressed differently.

PowerShell's mental shift is the object pipeline. bash pipes bytes and every stage re-parses text; PowerShell pipes .NET objects and every stage receives typed properties. Get-ChildItem emits FileInfo objects, so Where-Object can filter on a numeric Length without cutting columns out of a directory listing. Get-Member tells you what an object actually has. Cmdlets are Verb-Noun with an approved verb list, which is why discovery works and why you can often guess a cmdlet name correctly on the first attempt.

The trap that produces most broken Windows CI is error handling. The ErrorActionPreference variable defaults to Continue, and Continue means a non-terminating error prints in red and the script keeps going — then exits with zero. try and catch do not catch a non-terminating error at all; they catch terminating ones. So the script that "worked" printed three errors and reported success. The fix is to set the preference to Stop at the top of every CI script, which escalates non-terminating errors to script-terminating ones that try and catch will see.

Native executables are a second, separate trap. msbuild, git, and signtool are not cmdlets — they do not raise PowerShell errors at all. They set the last-exit-code variable. PowerShell 7.4 added a preference variable that makes a non-zero native exit code issue an error according to ErrorActionPreference, but its documented default is false. Until you opt in, every native tool invocation needs an explicit exit code check.

The diagram maps this onto an agent fleet: Perl scripts still driving the Unix side of the build, PowerShell driving MSBuild, the Visual Studio developer shell, and signtool on the Windows side, with one orchestration layer calling into both.`,
      },
      {
        title: 'Quick-fire interview answers — Perl and PowerShell',
        description: `Q: Why is Perl still in mature build systems?
A: Three reasons that predate every alternative. Its regular expression engine is the reference everyone else copied, so text munging — parsing compiler output, rewriting manifests, extracting versions — is native. It ships on essentially every Unix system, which mattered when installing a runtime on a build machine required a ticket. And the code works, so nobody has funded a rewrite. You inherit it, you do not choose it.

Q: What does Perl system() return, and how do you check whether the command succeeded?
A: It returns the wait status, not the exit code. Shift right by eight to get the actual exit value. A return of -1 means the program could not be started or the wait call failed, with the reason in the error variable. Masking the low seven bits tells you the signal number if the child was killed. Comparing the raw return to zero works for detecting success but gives you a meaningless number on failure.

Q: What is the single most important line in a PowerShell CI script?
A: Setting ErrorActionPreference to Stop at the top. The documented default is Continue, which prints a non-terminating error in red and keeps going, and try and catch do not catch non-terminating errors. Without Stop a script can print three errors and exit zero, which CI reads as success.

Q: You call msbuild.exe from PowerShell and it fails. Does the script stop?
A: No, by default. Native executables do not raise PowerShell errors — they set the last-exit-code variable. You must check it explicitly, or opt into the PowerShell 7.4 preference variable that makes non-zero native exits issue errors according to ErrorActionPreference. Its documented default is false.

Q: Is PowerShell execution policy a security control?
A: No, and Microsoft says so in the documentation — it is not a security system that restricts user actions, because a user who cannot run a script can simply type its contents at the command line. It prevents unintentional execution. In CI, running pwsh with -NoProfile and -ExecutionPolicy Bypass is normal practice, not a workaround.

Q: PowerShell 7 versus Windows PowerShell 5.1 — which do you target?
A: PowerShell 7.x for anything new: cross-platform, actively developed, and installed side by side with 5.1 rather than replacing it. Windows PowerShell 5.1 is in-box on every Windows machine and is what an unattended bootstrap can rely on before anything is installed. Some older Windows-only modules still require 5.1, which is what the compatibility layer exists for.`,
      },
    ],
    introduction: `A job description that names both Perl and PowerShell is telling you something concrete: this is an established build system with a Unix heritage and a Windows product surface. Nobody starts a new project in Perl. Nobody automates a Linux-only shop with PowerShell. Both appearing together means legacy build tooling on one side and Windows agents on the other, and the role involves keeping both alive.

Perl is the maintenance problem. It is present because it was the right choice in 2008 — the best regular expression engine available, installed by default on every Unix system, and unbeatable at the text manipulation that build scripts are mostly made of. The code that resulted is still running, still correct, and generally still faster than whatever would replace it. The skill being tested is not writing new Perl. It is opening a script you have never seen, understanding it quickly, changing it safely, and making a defensible call about whether to migrate it.

That reading skill is a specific, learnable set. Sigils and context. my versus our versus local. References and the two dereference syntaxes you will see mixed within one file. Hashes of arrays as the standard shape for targets and their options. Regular expressions with captures. Here-documents and their quoting rule. And the process-execution family — system, backticks and qx, and piped open — where exit status handling is subtle enough that most legacy scripts get it partly wrong.

PowerShell is the opposite problem: it is where you write new code, and the language actively misleads people arriving from bash. The object pipeline is the good surprise — pipes carry typed .NET objects rather than bytes, so filtering and selecting are property operations rather than column-cutting. The bad surprise is error handling. The default ErrorActionPreference is Continue, non-terminating errors neither stop the script nor get caught by try and catch, and native executables like msbuild do not raise PowerShell errors at all. A script can print several errors and still exit zero.

That is the interview question hiding in the job description: why did the Windows build report green when the build was broken? The answer involves ErrorActionPreference and the last-exit-code variable, and knowing it separates people who have run Windows CI from people who have read about it.

The rest of what an interviewer probes on the PowerShell side is operational. Execution policy — what it is, what its scopes are, and the fact that Microsoft explicitly documents it as not a security system that restricts user actions. PowerShell 7 versus Windows PowerShell 5.1 and when each is the right target. Pester for testing scripts, because untested PowerShell is exactly as dangerous as untested bash. And driving the Windows toolchain: locating Visual Studio, entering the developer shell so the compiler environment actually exists, and invoking MSBuild and signtool with exit codes that propagate.`,
    whenToUse: [
      'Inheriting a Unix build system with Perl scripts you must change without a rewrite budget',
      'Any Windows build agent — MSBuild, the Visual Studio developer shell, signtool, and installer packaging are all driven from PowerShell',
      'Text-heavy transformation of build output where a regex-first language genuinely is the shortest correct solution',
      'Cross-platform automation targeting Windows, Linux, and macOS agents from one script using PowerShell 7',
      'Deciding, with evidence rather than taste, which legacy scripts to migrate and which to leave alone',
    ],
    keyConcepts: [
      {
        term: 'use strict; use warnings;',
        definition: 'The two pragmas that make Perl maintainable. strict forces variable declaration and forbids symbolic references; warnings surfaces undefined-value use, numeric conversion of non-numbers, and duplicate subroutine definitions. A legacy script missing both is the first thing to fix, and the fix is usually noisy enough to deserve its own commit.',
      },
      {
        term: 'Perl system() exit status',
        definition: 'system returns the wait status, not the exit code. Shift right by eight for the actual exit value. A return of -1 means the program failed to start or the wait call errored, with the reason in the error variable. Masking the low seven bits of the status gives the signal number if the child was killed.',
      },
      {
        term: 'Getopt::Long',
        definition: 'The standard Perl option parser. GetOptions maps specifications to variable references and removes recognised options from the argument array. Specifications include =s for string, =i for integer, =f for float, ! for negatable, + for incrementing, =s@ to collect into an array, and =s% into a hash. It returns false when it detected parse errors, which callers routinely ignore.',
      },
      {
        term: 'File::Find',
        definition: 'The core directory walker. find takes a callback and a list of directories; inside the callback the module sets the current directory, the bare filename, and the full path in three package variables. The no_chdir option stops it changing directory, in which case the filename variable holds the full path instead.',
      },
      {
        term: 'Object pipeline',
        definition: 'PowerShell pipes .NET objects, not text. Get-ChildItem emits FileInfo objects so Where-Object filters on a numeric Length with no column parsing. Get-Member enumerates an object properties and methods. This is the biggest mental shift for someone arriving from bash.',
      },
      {
        term: 'ErrorActionPreference',
        definition: 'Controls how PowerShell responds to non-terminating errors. Documented values are Continue, SilentlyContinue, Stop, Inquire, Ignore, and Break, with Continue as the default. Setting it to Stop escalates non-terminating errors to script-terminating errors, which is what makes try and catch and CI exit codes behave the way people expect.',
      },
      {
        term: 'Native command exit codes',
        definition: 'The last-exit-code variable holds the exit code of the last native executable, as distinct from the boolean success variable. Native tools like msbuild.exe and signtool.exe raise no PowerShell error. PowerShell 7.4 added a preference variable that makes non-zero native exits issue errors according to ErrorActionPreference, with a documented default of false.',
      },
      {
        term: 'Execution policy',
        definition: 'A safety feature controlling whether PowerShell loads configuration files and runs scripts. Values include Restricted, AllSigned, RemoteSigned, Unrestricted, Bypass, Undefined, and Default, and enforcement occurs only on Windows. Microsoft documents it as not a security system that restricts user actions, since script contents can simply be typed at the command line.',
      },
    ],
    approach: [
      'For inherited Perl, run a syntax check on every script first to establish a clean baseline before changing anything',
      'Add use strict and use warnings to one script at a time, fix the resulting noise, and commit that separately from any behaviour change',
      'Characterise before you touch: capture current output for known inputs so you have a golden reference to diff against after edits',
      'Migrate only at seams with real pain — a script that is stable, fast, and unchanged for three years is not a migration candidate regardless of language',
      'For new PowerShell, begin every CI script with Set-StrictMode at the latest version and ErrorActionPreference set to Stop',
      'Wrap native tool invocations in one helper that checks the exit code and throws, the same single-seam pattern used for Python subprocess wrappers',
      'Add Pester coverage for the branching logic and run it in CI with a machine-readable output format and a configuration that exits non-zero on failure',
    ],
    pitfalls: [
      'Testing Perl system() by comparing its return value to an expected exit code — you are comparing a wait status, so the number is eight bits off',
      'Using the single-argument form of Perl system with an interpolated variable — if the string contains shell metacharacters it is handed to the shell, which is command injection',
      'Leaving ErrorActionPreference at its Continue default in a CI script, so errors print in red and the script exits zero',
      'Expecting try and catch to catch a non-terminating error — they do not, unless the command is given -ErrorAction Stop or the preference variable is set to Stop',
      'Calling msbuild.exe or signtool.exe and never checking the last exit code, so a failed build or a failed signature produces a green pipeline',
      'Running vcvarsall.bat from PowerShell and expecting the compiler environment to persist — it sets variables in a cmd.exe child that then exits, taking them with it',
    ],
    keyQuestions: [
      {
        question: 'You inherit a 4,000-line Perl build script. Walk through how you read it and how you decide whether to maintain it or migrate it.',
        answer: `First, resist the urge to rewrite. That script encodes years of accumulated correctness — edge cases, platform quirks, and workarounds for tools that are still in the build. A rewrite reintroduces all of them as new bugs, and it will take three times the estimate.

Reading it. Establish a baseline with a syntax check, which validates without running. Then find the entry point: usually the last statement at file scope, or a main subroutine called at the bottom. Then map the option surface, which is normally a single GetOptions block near the top — that gives you the script's entire external contract in one screen. Then list the subroutines with a grep for the sub keyword at line start.

The constructs you need to recognise on sight.

Sigils and context. An array in scalar context evaluates to its length. Unpacking the argument array into a list of lexicals is the standard first line of a subroutine. A subroutine calling wantarray behaves differently depending on how it was called, which is usually a sign of an old API.

References and their two dereference forms, which you will find mixed in the same file. The arrow form on an array reference and the circumfix form with a dollar-brace prefix mean the same thing; likewise for hash references. The arrow between consecutive subscripts is optional, so two chained subscripts with and without an intervening arrow are identical.

Hashes of arrays, which is how build scripts hold targets — a hash key per platform whose value is an array reference of flags, appended to by dereferencing the reference in a push.

Regular expressions with captures assigned in list context, which is how versions get split into major and minor in one line.

Here-documents, where the terminator quoting is the whole story. A double-quoted terminator interpolates variables; a single-quoted one does not. A here-document emitting a Makefile or a shell script is almost always the single-quoted form, for exactly that reason.

Process execution: system, backticks or qx for capture, and open with a pipe. In legacy code this is where the bugs are, because exit status handling is subtle.

Then the safety work, in this order and in separate commits. Add use strict and use warnings, fix the fallout, commit. Add a characterisation harness — run the script against known inputs and capture stdout, stderr, the exit code, and any files it writes, storing those as golden files. Now you have a regression net. Optionally run a static analyser to find genuinely risky constructs, but ignore its stylistic complaints on a legacy file or you will drown in noise and learn nothing.

The migrate-or-maintain decision. Migrate when you are changing it constantly and every change is frightening; when it is a real hiring constraint because nobody left can read it; when it depends on modules that no longer install cleanly on your current Perl; or when it sits on a seam you are already replacing for other reasons.

Maintain when it is stable and has not needed a change in years; when it is heavily text-processing, which is where Perl is genuinely strongest and a port will be both slower and longer; when the behaviour is under-specified, meaning a port is a guess dressed as an estimate; or when nothing downstream is changing.

The strategy that actually works is strangler-style rather than big-bang. Keep the Perl script as the entry point and move one subroutine at a time behind a call to the new tool. Each move is small, independently revertable, and validated by the characterisation harness. The script shrinks over quarters, and at no point is there a flag day.

The wrong answer is "I would rewrite it in Python." That answers a question about engineering judgement with an expression of taste, and it signals you have not been on the wrong side of a build-system rewrite.`,
      },
      {
        question: 'In Perl, how do you run an external command and correctly determine whether it failed? Cover system, backticks, and pipes.',
        answer: `This is where legacy Perl build scripts are most often subtly wrong, which makes it a good interview question.

system forks, executes, and waits. It returns the wait status — not the exit code. The documented rule is that you shift right by eight to get the actual exit value, and a return of -1 means the program could not be started or the wait call itself errored, with the reason in the error variable. The complete check:

\`\`\`perl
my @cmd = ('make', '-j8', 'all');
my $rc = system(@cmd);

if ($rc == -1) {
    die "failed to execute $cmd[0]: $!";
}
elsif ($rc & 127) {
    die sprintf("%s died with signal %d", $cmd[0], $rc & 127);
}
elsif ($rc >> 8) {
    die sprintf("%s exited with %d", $cmd[0], $rc >> 8);
}
\`\`\`

Three distinct failure modes, three distinct messages. A script that writes system(@cmd) == 0 or die is correct about success but throws away which of the three happened — and a build that died from a kill signal because the agent ran out of memory then looks identical to a compile error, which costs you an afternoon.

The list form versus the string form is the security point, and it mirrors Python exactly. With more than one argument the first element is the program and the rest are its arguments, with no shell involved. With a single scalar argument, Perl checks it for shell metacharacters and, if any are present, hands the whole string to the system shell. So interpolating a tag name into a single string is command injection, and passing the same tag as its own list element is safe. Always the list form when any part is interpolated.

Backticks and qx capture standard output instead of inheriting it. The command's output becomes the return value — one string in scalar context, a list of lines in list context. Standard error is not captured and goes to the parent's stderr. Exit status still lands in the status variable and needs the same shift-right-by-eight treatment:

\`\`\`perl
my $sha = qx(git rev-parse HEAD);
die "git rev-parse failed: " . ($? >> 8) if $?;
chomp $sha;
\`\`\`

The chomp matters. The trailing newline is included, and a version string with an embedded newline produces spectacularly confusing downstream failures — usually a filename with a line break in it. And note that backticks always involve the shell, so interpolating untrusted values into them has the same injection problem as the single-argument system form.

Piped open gives you a filehandle onto the child, which is what you want for streaming rather than buffering an entire build log into memory:

\`\`\`perl
open(my $fh, '-|', 'make', '-j8', 'all')
    or die "cannot run make: $!";
while (my $line = <$fh>) {
    print "[build] $line";
}
close($fh);
my $exit = $? >> 8;
die "make failed with $exit" if $exit;
\`\`\`

The list form of open with the read-pipe mode avoids the shell, the same way the list form of system does. The status is only valid after close, which is the part people forget — reading it while the handle is still open gives a stale value from whatever ran previously. The write-pipe direction gives you a handle you write to, feeding the child's standard input.

For capturing standard output and standard error separately, the core option is IPC::Open3, and IPC::Run3 from CPAN is considerably more pleasant. Anything hand-built out of temporary files and shell redirection in a legacy script is a good candidate for replacement with one of those.

The summary an interviewer wants: system for run-and-check, backticks for capturing small output, piped open for streaming, always the list form when values are interpolated, and always decode the status variable rather than treating it as an exit code.`,
      },
      {
        question: 'A PowerShell CI script reports success but the build is broken. Walk through why, and how you fix it.',
        answer: `There are three independent mechanisms that produce this, and a complete answer names all three, because a script can be hit by any of them separately.

Mechanism one: ErrorActionPreference defaults to Continue.

PowerShell distinguishes terminating from non-terminating errors. A non-terminating error — which is what most cmdlets emit on failure — prints in red, is recorded in the error collection, and execution continues to the next statement. At the end of the script nothing has thrown, so the exit code is zero. The log is full of red text and CI reports green.

Worse, try and catch do not catch non-terminating errors. This is the most surprising thing about the language for someone coming from bash or Python:

\`\`\`powershell
try {
    Copy-Item -Path 'C:\\does\\not\\exist' -Destination 'C:\\out'
    Write-Host "copy succeeded"     # this line still runs
}
catch {
    Write-Host "never reached"
}
\`\`\`

Two fixes, and you want both. Per command, add -ErrorAction Stop to promote that one call. Script-wide, set the preference at the top:

\`\`\`powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
\`\`\`

With Stop, non-terminating errors escalate to script-terminating ones, try and catch behave as expected, and an uncaught error produces a non-zero exit.

Mechanism two: native executables do not raise PowerShell errors at all.

msbuild.exe, git.exe, signtool.exe, cl.exe — these are not cmdlets. They have no concept of the PowerShell error stream. They set an exit code, and ErrorActionPreference has no bearing on them by default. A failed msbuild leaves the last exit code at 1 and the script sails on:

\`\`\`powershell
& msbuild.exe Solution.sln -p:Configuration=Release
if ($LASTEXITCODE -ne 0) { throw "msbuild failed with $LASTEXITCODE" }
\`\`\`

PowerShell 7.4 added a preference variable that makes native commands with non-zero exit codes issue errors according to ErrorActionPreference. Its documented default is false, so you must opt in. And be aware that some tools use non-zero exits for non-error information — robocopy is the canonical example, which is exactly the case Microsoft documents — so you disable the behaviour locally around those and check the code by hand.

The durable pattern is a single wrapper, the same seam idea as a Python run helper:

\`\`\`powershell
function Invoke-Native {
    param([Parameter(Mandatory)][string] $Exe,
          [string[]] $Arguments = @())
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Exe exited with $LASTEXITCODE"
    }
}
\`\`\`

Mechanism three: the script's own exit code.

Even with everything above correct, a script that catches an exception, logs it, and falls off the end exits zero. In a catch block, log and then exit non-zero explicitly:

\`\`\`powershell
try {
    Invoke-Native msbuild.exe @('Solution.sln', '-p:Configuration=Release', '-m')
}
catch {
    Write-Error $_
    exit 1
}
\`\`\`

Also check how CI invokes the script. Some runners call the shell with a -Command string, which can mask the script's exit code depending on the wrapper. Invoking with -File propagates it cleanly, and adding -NoProfile stops a developer profile left on the agent from changing behaviour.

The header every CI script should have:

\`\`\`powershell
#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
\`\`\`

Set-StrictMode at the latest version is the fourth quiet win: it turns references to uninitialised variables into errors. A typo in a variable name otherwise silently evaluates to null, and a null path argument produces a build that succeeds while writing nothing anywhere.`,
      },
      {
        question: 'Explain the PowerShell object pipeline to someone who only knows bash. What actually changes in how you write scripts?',
        answer: `In bash a pipeline moves bytes. Every stage serialises to text and the next stage re-parses it. That is why shell scripting is a career of awk, cut, sed, and column counting, and why it breaks the moment a filename contains a space.

In PowerShell a pipeline moves .NET objects. Get-ChildItem does not emit lines; it emits FileInfo objects with typed properties — a numeric length, a DateTime for last write, a string full name. Nothing is parsed because nothing was ever serialised.

The same task in both:

\`\`\`bash
ls -l build/ | awk '$5 > 10485760 {print $9}' | sort
\`\`\`

\`\`\`powershell
Get-ChildItem build\\ |
    Where-Object Length -gt 10MB |
    Sort-Object Length -Descending |
    Select-Object Name, Length
\`\`\`

The bash version depends on the column layout of a long directory listing, which varies by platform and locale, and it breaks on filenames with spaces. The PowerShell version compares a number to a number, with 10MB as a native literal. Nothing can be misparsed because nothing is parsed.

What actually changes in how you write scripts.

You stop parsing and start selecting. Where-Object filters on properties, Select-Object projects them, and Sort-Object and Group-Object work on typed values. Sorting by size is numeric rather than lexicographic, so the classic bug where 9 sorts after 10 simply cannot occur.

Discovery replaces documentation. Get-Member on any object lists its properties and methods. When you do not know what a cmdlet returns, you pipe it to Get-Member. There is no equivalent for "what are the columns of this tool's output on this platform".

Verb-Noun naming makes the command surface guessable. Get-Verb lists the approved verbs, and cmdlets follow them — Get, Set, New, Remove, Start, Stop, Test, Invoke, Export. Get-Command filtered by noun finds everything operating on a given kind of thing. This is why you can often guess a cmdlet name correctly on the first try, which is not true of any Unix toolset.

Structured data stays structured. ConvertFrom-Json produces objects you access by property. Invoke-RestMethod parses the response for you. Import-Csv gives objects with named columns. The round trip through a JSON command-line processor and string manipulation mostly disappears.

Output formatting is a separate, final concern. Format-Table and Format-List produce display objects, not data, which is why a Format cmdlet must be the last thing in a pipeline. Piping formatted output into another cmdlet is a classic beginner bug: the next stage receives formatting instructions rather than your data, and the error message does not explain that.

Two honest caveats, because an interviewer will want the balance.

Native tools are still text. git, msbuild, and signtool emit strings. You get objects only within the cmdlet world, and for those tools you are back to regular expressions — or you use their JSON output modes and convert at the boundary.

Objects are heavier. Passing half a million objects through a five-stage pipeline is measurably slower than the equivalent byte stream, and the pipeline preserves order at some cost. On a build agent processing large logs this matters, and the fix is to filter as early in the pipeline as possible — put the Where-Object before the Sort-Object, never after.`,
      },
      {
        question: 'How do you drive MSBuild and the Visual Studio toolchain from PowerShell on a build agent? Include the environment problem.',
        answer: `The environment problem first, because it is what surprises people.

The Visual Studio C and C++ toolchain does not work from a bare shell. The compiler, the linker, and the SDK headers require a set of environment variables — include paths, library paths, and several Visual Studio specific ones — that are established by vcvarsall.bat. That is a batch file. Running it from PowerShell starts a cmd.exe child, the child sets its own environment, and the child exits, taking the environment with it. The parent PowerShell session is unchanged, and the next command fails with a missing header.

There are two correct answers.

The Microsoft-supported one is the developer shell module. Visual Studio ships a DevShell library with an Enter-VsDevShell command that configures the current PowerShell session properly. Locate the installation first with vswhere.exe, which lives at a fixed path under the 32-bit Program Files directory precisely so that it is findable without knowing where Visual Studio is:

\`\`\`powershell
$pf86    = [Environment]::GetFolderPath('ProgramFilesX86')
$vswhere = Join-Path $pf86 'Microsoft Visual Studio\\Installer\\vswhere.exe'

$vsPath = & $vswhere -latest -products * \`
    -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 \`
    -property installationPath
if (-not $vsPath) { throw "no Visual Studio installation with the C++ toolset found" }

Import-Module (Join-Path $vsPath 'Common7\\Tools\\Microsoft.VisualStudio.DevShell.dll')
Enter-VsDevShell -VsInstallPath $vsPath -SkipAutomaticLocation -DevCmdArguments '-arch=x64'
\`\`\`

vswhere is the part worth knowing. Hardcoding a path that names a specific year and edition is the single most common cause of "works on my agent" — agents have Community, Professional, Enterprise, and Build Tools editions in different combinations, and the path differs for each. Requiring a specific component identifier also lets you fail fast with a clear message when an agent is missing the C++ workload, rather than failing later with a confusing missing-compiler error.

The alternative, when the module is unavailable, is to run the batch file in cmd, dump the resulting environment, and import it into the current session. It works, and a lot of older automation does exactly that, but it is fragile against quoting and multi-line values. Prefer the developer shell.

Once the shell is configured, MSBuild is a normal native tool with normal exit-code discipline:

\`\`\`powershell
$msbuildArgs = @(
    'Product.sln'
    '-restore'
    '-p:Configuration=Release'
    '-p:Platform=x64'
    '-m'                        # parallel across projects
    '-v:minimal'                # keep the CI log readable
    '-nologo'
    "-p:Version=$Version"
)
& msbuild.exe @msbuildArgs
if ($LASTEXITCODE -ne 0) { throw "msbuild failed with exit code $LASTEXITCODE" }
\`\`\`

Notes on those flags. The restore switch performs package restore in the same invocation, which avoids a separate step that can drift out of sync with the build. The parallel switch enables concurrent project builds and is usually the largest single win on a multi-project solution. Minimal verbosity keeps the log to something a human will actually read; diagnostic verbosity is what you switch to when investigating, and it is enormous. Passing the version as a property rather than editing files means nothing in the working tree is mutated by the build, which keeps the tree clean for the signing step that follows.

The splatting form — an array expanded into the call — is worth using deliberately. Building one long string and invoking it is where quoting bugs live, especially with paths containing spaces, which on Windows is most of them.

The same discipline covers the rest of the Windows toolchain. signtool.exe, the installer packaging tools, and the test runner are all native executables with meaningful exit codes and no PowerShell error integration. Route every one of them through the same Invoke-Native wrapper so that no failure can pass silently.

One last agent-level detail: invoke the script with -NoProfile, -ExecutionPolicy Bypass, and -File. -NoProfile stops a profile left on the agent from altering behaviour, and Bypass avoids a machine-wide policy blocking an unsigned CI script. Neither is a security compromise, since Microsoft documents execution policy as not being a security system that restricts user actions.`,
      },
      {
        question: 'How do you test PowerShell build scripts, and what does execution policy mean in CI?',
        answer: `Testing first. Untested PowerShell is exactly as dangerous as untested bash, and the standard answer is Pester.

Pester 5 structures tests as Describe, Context, and It blocks with Should assertions, and BeforeAll for setup:

\`\`\`powershell
BeforeAll {
    . $PSScriptRoot/../src/Build.ps1
}

Describe 'Get-BuildConfiguration' {
    Context 'when the branch is main' {
        It 'selects the Release configuration' {
            (Get-BuildConfiguration -Branch 'main').Configuration | Should -Be 'Release'
        }
    }

    Context 'when the branch is a feature branch' {
        It 'selects Debug and disables signing' {
            $cfg = Get-BuildConfiguration -Branch 'feature/x'
            $cfg.Configuration | Should -Be 'Debug'
            $cfg.Sign          | Should -BeFalse
        }
    }
}
\`\`\`

The mechanism that makes build scripts testable is Mock, which replaces a command within the scope of a test. That is how you assert on what would have been invoked without invoking it:

\`\`\`powershell
Describe 'Invoke-Build' {
    It 'passes the version through to msbuild' {
        Mock Invoke-Native { }
        Invoke-Build -Version '4.2.0'
        Should -Invoke Invoke-Native -Times 1 -ParameterFilter {
            $Arguments -contains '-p:Version=4.2.0'
        }
    }
}
\`\`\`

Note the structural requirement: this works only because every native call goes through one Invoke-Native function. Scattered inline calls to msbuild.exe are not mockable in any clean way. The testability argument is itself a reason for the single-wrapper pattern, and it is worth saying so.

Driving it from CI uses a configuration object rather than a pile of switches:

\`\`\`powershell
$config = New-PesterConfiguration
$config.Run.Path                = './tests'
$config.Run.Exit                = $true          # non-zero exit on failure
$config.TestResult.Enabled      = $true
$config.TestResult.OutputFormat = 'NUnitXml'     # for CI test reporting
$config.CodeCoverage.Enabled    = $true
Invoke-Pester -Configuration $config
\`\`\`

The exit setting is the one that matters for CI. Without it, Invoke-Pester reports failures and still exits zero, which is the same green-on-broken problem as everything else in this topic.

Now execution policy, which is where candidates most often overstate things.

Execution policy controls the conditions under which PowerShell loads configuration files and runs scripts. The documented values are Restricted (no scripts at all), AllSigned (every script must be signed by a trusted publisher, including ones you wrote locally), RemoteSigned (scripts downloaded from the internet must be signed, local ones need not be, and this is the default for Windows clients and servers), Unrestricted (the default on non-Windows, where it cannot be changed), Bypass (nothing blocked, no warnings or prompts), plus Undefined and Default. Enforcement of these policies occurs only on Windows platforms.

Scopes, in documented precedence order: MachinePolicy, UserPolicy, Process, CurrentUser, LocalMachine. Group Policy at the top wins over anything set locally, which is why Set-ExecutionPolicy can report success and change nothing effective — a fact worth knowing when debugging an agent. Get-ExecutionPolicy with the list switch shows all scopes at once and is the diagnostic to reach for first.

The critical point, and Microsoft states it plainly: the execution policy is not a security system that restricts user actions, because a user who cannot run a script can simply type its contents at the command line. It exists to help users set basic rules and prevent them from violating those rules unintentionally.

So in CI this is entirely normal and not a workaround:

\`\`\`
pwsh -NoProfile -ExecutionPolicy Bypass -File ./build.ps1
\`\`\`

Bypass here is scoped to that process only — the documented behaviour is that a policy set this way is stored in an environment variable and deleted when the session closes. It does not weaken the machine and it does not persist. What you should not do is set the policy permanently at machine scope on the agent as a fix, because that is a persistent global change solving a per-invocation problem.

The genuine signing conversation is a different one: AllSigned combined with signed scripts is a real control in a locked-down enterprise, but it is enforced by code signing, not by the policy value alone. If an interviewer pushes on securing script execution, the answer is signing and constrained language mode, not execution policy.`,
      },
    ],
    references: [
      'https://perldoc.perl.org/functions/system',
      'https://perldoc.perl.org/Getopt::Long',
      'https://perldoc.perl.org/File::Find',
      'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables',
      'https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 21. Bitbucket Pipelines
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-bitbucket-pipelines',
    title: 'Bitbucket Pipelines',
    icon: 'gitMerge',
    color: '#ea580c',
    questions: 5,
    description: 'Atlassian container-per-step CI: bitbucket-pipelines.yml structure, caches versus artifacts, the shared per-step memory ceiling people hit, self-hosted runners, deployments, OIDC, and an honest comparison to GitHub Actions and GitLab CI.',
    visualizations: [
      {
        title: 'The container-per-step execution model and where its limits bite',
        image: '/diagrams/devops/nb-21-bitbucket-pipelines.png',
        description: `Bitbucket Pipelines has one structural idea: every step runs in its own fresh Docker container, and nothing survives between steps except what you explicitly declare. Understand that and most of the surprising behaviour becomes predictable.

The file lives at the repository root as bitbucket-pipelines.yml. At the top level you have image (the default container for every step), clone (depth and LFS behaviour), options (global settings such as max-time), definitions (reusable caches, services, and step anchors), and pipelines, which holds the actual triggers:

\`\`\`yaml
image: python:3.12-slim

definitions:
  caches:
    uvcache: ~/.cache/uv
  services:
    postgres:
      image: postgres:16
      memory: 512
      variables:
        POSTGRES_PASSWORD: dev

pipelines:
  default:
    - step:
        name: Unit tests
        caches: [uvcache]
        script:
          - uv sync --frozen
          - uv run pytest -q
  branches:
    main:
      - step: &build
          name: Build
          script:
            - uv run buildtool compile
          artifacts:
            - dist/**
      - step:
          name: Deploy staging
          deployment: staging
          script:
            - uv run buildtool deploy
  pull-requests:
    '**':
      - step: *build
  tags:
    'v*':
      - step:
          name: Release
          deployment: production
          trigger: manual
          script:
            - uv run buildtool release
  custom:
    nightly-full:
      - step:
          name: Full matrix
          size: 2x
          max-time: 240
          script:
            - uv run buildtool compile --all
\`\`\`

The pipeline types are default (runs when nothing more specific matches), branches, tags, bookmarks, pull-requests, and custom. Only one section matches a given push — branches beats default — and pull-requests builds a merge of the source into the destination rather than the source alone, which is why a pull request build can fail on a branch whose own build passed.

The documented step properties are worth knowing precisely, because they define the whole surface: a step requires script, and optionally accepts after-script, artifacts, caches, clone, condition, deployment, fail-fast, image, name, oidc, runs-on, runtime, services, size, and trigger. A single pipeline can have up to 100 steps.

Caches and artifacts are the distinction people get wrong, and the mental model follows directly from container-per-step. Artifacts move files forward between steps of the same pipeline run — compile in step one, declare an artifacts glob, and step two receives them. Caches move files across pipeline runs, so yesterday's dependency directory reappears today. Artifacts are correctness; caches are speed. Bitbucket documents nine predefined caches — docker, composer, dotnetcore, gradle, ivy2, maven, node, pip, and sbt — and custom caches are declared under definitions with a path and optionally a key based on a set of files, so that changing a lockfile produces a new cache rather than restoring a stale one. Two documented limits matter operationally: only caches under 1 GB once compressed are saved, and any cache older than one week is cleared automatically and repopulated on the next build. A cache silently crossing the 1 GB threshold is the usual explanation for "our cache stopped working and nobody changed anything".

Memory is the hardest limit to design around, because it is shared. By default a step running on Bitbucket Cloud infrastructure or a Linux Docker self-hosted runner has 4 GB of memory, 4 CPUs which may be shared with other tasks, and 64 GB of disk for mounting volumes. Specifying a size of 2x doubles the memory, and the documentation is explicit that the memory allocated is shared by both the script in the step and any services on the step. Service containers default to 1024 MB each, with a documented maximum of five per step, and the build container needs at least 1024 MB for the build process and Pipelines overhead. The arithmetic is unforgiving: start a Postgres, a Redis, and the Docker service on a 1x step at defaults and you have given away 3 GB of your 4 GB before the compiler starts. The symptom is a container killed with no useful message.

Sizes above 2x exist — the allowed values are 1x, 2x, 4x, 8x, 16x, 24x, and 32x — and 4x and above additionally grant dedicated CPUs and more disk. They are only available on paid plans, and the cost is linear and explicit: a 4x step uses four times the build minutes of a 1x step, a 2x step twice as many, and so on. Size has no effect on shell-based runners, which use all available resources on the host.

Time limits round it out. The default maximum time for a pipeline step is 120 minutes, and max-time accepts any positive integer between 1 and 720, settable globally under options or per step.

Runners are the escape hatch. When your toolchain cannot live in a cloud image — a licensed compiler, a macOS notarisation step, a Windows SDK — you register a self-hosted runner and target it with runs-on labels. A step runs on the next available runner that has all the listed labels; if none online matches every label, the step fails. Notably, you are not charged build minutes for work run on your own self-hosted runners.

Deployments add the environment layer: a deployment property on a step marks it as targeting that environment, unlocks deployment-scoped variables, and populates the Deployments view with what is currently where. Combined with a manual trigger, that is the approval gate for production.`,
      },
      {
        title: 'Quick-fire interview answers — Bitbucket Pipelines',
        description: `Q: What is the difference between a cache and an artifact?
A: Artifacts pass files between steps within one pipeline run — build in step one, consume in step two — and they are a correctness mechanism. Caches persist across pipeline runs to avoid re-downloading dependencies, and they are a speed optimisation that is explicitly best-effort. If your pipeline breaks when a cache is cold, you have used a cache where you needed an artifact.

Q: Why did my step get killed with no error message?
A: Almost always memory. A default step has 4 GB shared between the build container, every service container, and Pipelines overhead, and each service defaults to 1024 MB with a maximum of five per step. Two or three services at defaults leave the build container with very little. Size the services explicitly, drop unused ones, or move the step to 2x for double the memory.

Q: How do you run a step on your own hardware?
A: Register a self-hosted runner and select it with runs-on labels on the step. The step runs on the next available runner carrying all the listed labels, and if no online runner matches every label the step fails. That is how you handle a licensed toolchain, macOS signing and notarisation, or a Windows SDK. You are also not charged build minutes for self-hosted runner time.

Q: How do you deploy to AWS without storing long-lived keys?
A: Set oidc to true on the step. Bitbucket issues a signed token in the step OIDC token variable, and you register the Bitbucket identity provider URL and audience as a trusted provider on the AWS side, then exchange the token for temporary credentials with assume-role-with-web-identity. No static access key ever exists in the repository.

Q: How do you avoid copy-pasting the same step three times?
A: YAML anchors and aliases. Define the step once with an anchor, then reference it by alias in default, branches, and pull-requests. For logic shared across repositories, use a Pipe — a versioned Docker container invoked with a pipe property and a variables block.

Q: Honestly, where does Bitbucket Pipelines fall short of GitHub Actions?
A: Reusable components. The Pipes catalogue is a fraction of the GitHub Actions marketplace, there is no equivalent of reusable workflows or composite actions, and there is no native matrix strategy — you write the steps out or generate them. It is a clean, opinionated, container-per-step system with a much smaller ecosystem around it.`,
      },
    ],
    introduction: `Bitbucket Pipelines is Atlassian's CI service, configured by a single bitbucket-pipelines.yml at the repository root and executed as a series of Docker containers. It is worth knowing specifically because a large population of enterprises standardised on Atlassian — Jira, Confluence, Bitbucket — and their build systems live here rather than on GitHub or GitLab. A job description that names Bitbucket is telling you which world you are entering.

The one architectural fact to internalise is container per step. Every step gets a fresh container from a declared image, runs its script, and is destroyed. Nothing persists to the next step unless you declared it — as an artifact for within-run handoff, or as a cache for across-run reuse. Almost every confusing behaviour in the system follows from that: why the file you built vanished, why installing a tool in step one does not help step two, why a cache miss is slow but never wrong.

The second fact is the shared memory budget. A step has a total memory allocation — 4 GB by default, doubled at 2x — and the documentation is explicit that it is shared by both the script in the step and any services attached to it. Services default to 1024 MB each and a step may have at most five. Teams routinely attach a database, a cache, and the Docker service, leave everything at defaults, and then spend a day debugging a build container being killed for lack of memory. That arithmetic is the most commonly hit real limit in the product.

Beyond that the feature set is what you would expect, configured the way you would expect. Pipelines are keyed by trigger type — default, branches, tags, bookmarks, pull-requests, and custom. Steps can run in parallel, stages group them, and a pipeline is capped at 100 steps. Deployments attach an environment to a step, unlock environment-scoped variables, and populate a deployment tracking view. Variables come in workspace, repository, and deployment scopes, with the documented override order being pipeline over deployment over repository over workspace over default, and secured variables are masked in logs. OIDC gives keyless authentication to cloud providers. Self-hosted runners let you execute on your own Linux, Windows, or macOS hardware, and their build minutes are not charged.

Where an interviewer will push is on honesty about capability. Pipelines is clean and opinionated, but its reusability story is thin next to GitHub Actions: Pipes are the reusable-step mechanism and the catalogue is small, there is no equivalent to reusable workflows or composite actions, and there is no native matrix strategy — you either write the steps out or generate the YAML. Build minutes are a visible cost constraint that genuinely changes pipeline design, particularly since larger sizes consume minutes at a proportionally higher rate. That is a legitimate engineering input rather than a complaint.`,
    whenToUse: [
      'The organisation is standardised on Atlassian and the code already lives in Bitbucket Cloud, where the Jira and deployment integration is the main draw',
      'Straightforward container-based build, test, and deploy flows where the opinionated model is a feature rather than a limit',
      'Toolchains that cannot run in a cloud image — licensed compilers, macOS signing, Windows SDKs — combined with self-hosted runners for those steps',
      'Deployments that need an environment model with manual approval gates and a tracked history of what is where',
      'Cloud deploys where you want OIDC federation instead of long-lived static credentials stored as repository variables',
    ],
    keyConcepts: [
      {
        term: 'Container per step',
        definition: 'Every step starts a separate Docker container built from the declared image and is destroyed afterwards. Nothing carries forward implicitly. This single rule explains artifacts, caches, and why installing a tool in one step does not make it available in the next.',
      },
      {
        term: 'Pipeline types',
        definition: 'Under pipelines you declare default, branches, tags, bookmarks, pull-requests, and custom. Only the most specific match runs. A pull-requests pipeline builds a merge of source into destination, which is why it can fail on a branch whose own build passed. Custom pipelines run only when triggered manually or on a schedule.',
      },
      {
        term: 'Artifacts',
        definition: 'Files declared with an artifacts glob in one step and made available to subsequent steps of the same pipeline run. The mechanism for passing build output forward, and correctness-critical in a way caches are not.',
      },
      {
        term: 'Caches',
        definition: 'Directories preserved across pipeline runs to avoid re-downloading dependencies. Nine predefined names exist including node, pip, maven, gradle, and docker; custom caches are declared under definitions with a path and an optional key based on files. Only caches under 1 GB compressed are saved, and caches older than one week are cleared automatically.',
      },
      {
        term: 'Step size and shared memory',
        definition: 'A default step has 4 GB of memory, 4 CPUs, and 64 GB of volume disk; size 2x doubles the memory, and the allocation is shared by the script and every service on the step. Allowed sizes are 1x, 2x, 4x, 8x, 16x, 24x, and 32x, with 4x and above requiring a paid plan and consuming build minutes at the same multiple.',
      },
      {
        term: 'Runners and runs-on',
        definition: 'Self-hosted execution agents registered to a repository or workspace and targeted with runs-on labels. A step runs on the next available runner carrying all listed labels, and fails if no online runner matches. Self-hosted runner time is not charged against build minutes.',
      },
      {
        term: 'Deployment variables',
        definition: 'Variables scoped to a named environment and exposed only to steps carrying that deployment. Combined with the documented override order — pipeline over deployment over repository over workspace over default — this is how one pipeline definition targets staging and production with different values and no conditional logic.',
      },
      {
        term: 'Pipes',
        definition: 'The reusable-step mechanism: a versioned Docker container invoked with a pipe property and a variables block. Functionally analogous to a GitHub Action, with a far smaller catalogue. Writing a private pipe is how you share a step across repositories in one workspace.',
      },
    ],
    approach: [
      'Start with one default pipeline containing a single step, get it green, and only then split into multiple steps — each split forces an explicit artifact decision',
      'Declare artifacts for anything a later step consumes, and caches only for pure speed; verify by running with a cold cache and confirming the pipeline still passes',
      'Do the memory arithmetic before adding a service: subtract every service allocation from the step total and confirm the build container keeps a workable remainder',
      'Factor repeated steps into YAML anchors, and promote genuinely cross-repository logic into a private Pipe',
      'Add a deployment property to steps that target an environment, put environment-scoped variables behind it, and gate production with a manual trigger',
      'Replace static cloud credentials with OIDC plus a trust relationship pinned to the specific repository, then delete the stored keys',
      'Track build minutes per pipeline and attack the biggest consumer first — usually an uncached dependency install, an oversized step, or a serial step that could be parallel',
    ],
    pitfalls: [
      'Relying on a cache for correctness — caches are best-effort, expire after a week, and are skipped above 1 GB compressed, so a cold cache must still produce a correct build',
      'Adding services at default memory until the build container is starved, then debugging a kill with no error message for a day',
      'Assuming a pull-requests pipeline builds the source branch — it builds a merge into the destination, so it can fail on a branch whose own pipeline is green',
      'Storing long-lived cloud access keys as secured repository variables when OIDC federation is available, leaving credentials that survive every employee departure',
      'Echoing a secured variable after transforming it — masking replaces matching values, so a base64-encoded or split secret is printed in the clear',
      'Reaching for a larger step size to fix a memory problem caused by unused services, which doubles or quadruples build minute consumption for no benefit',
    ],
    keyQuestions: [
      {
        question: 'Explain caches versus artifacts in Bitbucket Pipelines, including the limits, and describe a bug caused by confusing them.',
        answer: `Both exist because of container per step. Every step gets a fresh container and loses everything when it finishes, so any file crossing a boundary must be declared.

Artifacts cross steps within one pipeline run. A step declares an artifacts glob, and subsequent steps in that same run receive those paths.

\`\`\`yaml
- step:
    name: Build
    script:
      - uv run buildtool compile
    artifacts:
      - dist/**
      - build/reports/**
- step:
    name: Sign and publish
    script:
      - ls dist/            # present because the previous step declared it
      - uv run buildtool publish
\`\`\`

Caches cross pipeline runs. A directory saved at the end of a step is restored at the start of a matching cache in a later run.

\`\`\`yaml
definitions:
  caches:
    uvcache: ~/.cache/uv
    nodecustom:
      key:
        files:
          - package-lock.json
      path: node_modules

pipelines:
  default:
    - step:
        caches: [uvcache, nodecustom]
        script:
          - uv sync --frozen
\`\`\`

Nine caches are predefined — docker, composer, dotnetcore, gradle, ivy2, maven, node, pip, and sbt — and custom ones are declared as above. The file-based key is the important refinement: the cache is keyed on the contents of the listed files, so changing the lockfile produces a new cache rather than restoring a stale one. Without a key the cache is restored regardless of whether the dependency set changed, which is how you end up with an installed dependency tree that does not match the lockfile and a build failure nobody can reproduce locally.

Two documented limits govern behaviour. Only caches under 1 GB once compressed are saved — above that the save is skipped, silently from the pipeline's point of view. And any cache older than one week is cleared automatically and repopulated during the next build. Together these produce the classic report: caching stopped working and nobody changed anything. Usually the dependency tree crossed the size threshold, or the repository went quiet for eight days.

The distinction that matters conceptually: artifacts are correctness, caches are performance. A cache miss must only ever cost time. If a missing cache changes the outcome, the design is wrong.

The bug, which is common enough to be worth telling as a story. A team compiled in step one and deployed in step two, and instead of declaring artifacts they added the output directory as a cache. It worked in testing, because their test runs always had a warm cache from the previous run.

\`\`\`yaml
# Broken
- step:
    name: Build
    caches: [buildoutput]      # dist/ treated as a "cache"
    script: [ "make dist" ]
- step:
    name: Deploy
    caches: [buildoutput]
    script: [ "aws s3 sync dist/ s3://releases/" ]
\`\`\`

Three failure modes followed. On the first run after the weekly expiry the deploy step found an empty directory and published nothing — an empty release, reported green. On other runs it found last week's binaries and published those, which is worse: a successful deployment of the wrong build, with no signal anywhere. And once the output grew past 1 GB compressed, saving stopped entirely and the behaviour became intermittent in a way that looked like flakiness and got blamed on the CI provider.

The fix is one word — artifacts instead of caches — and the general rule that catches it in review: if removing the cache breaks the pipeline rather than merely slowing it, it was never a cache.`,
      },
      {
        question: 'A step is being killed with no useful error. Walk through diagnosing it, and explain the memory model.',
        answer: `Silent kills in Bitbucket Pipelines are memory, in the overwhelming majority of cases. The container hits its ceiling, the kernel out-of-memory killer terminates the process, and what you see in the log is output that simply stops mid-line.

The model. By default a step running on Bitbucket Cloud infrastructure or a Linux Docker self-hosted runner has 4 GB of memory, 4 CPUs which may be shared with other tasks, and 64 GB of disk for mounting volumes. Specifying a size of 2x doubles the memory. The documentation is explicit on the crucial point: the memory allocated is shared by both the script in the step and any services on the step. It is not a per-container allowance.

Within that budget, the build container needs a documented minimum of 1024 MB to cover the build process and Pipelines overhead. Service containers default to 1024 MB each, are configurable, and are capped at five per step. The remaining memory after service allocation goes to the build container.

Now the arithmetic that causes the incident:

\`\`\`yaml
definitions:
  services:
    postgres:
      image: postgres:16      # 1024 MB by default
    redis:
      image: redis:7          # 1024 MB by default

pipelines:
  default:
    - step:
        services: [postgres, redis, docker]   # docker also defaults to 1024 MB
        script:
          - ./gradlew test
\`\`\`

Three services at 1024 MB each is 3 GB of a 4 GB step. The build container is left with roughly 1 GB, and a JVM with default heap sizing will exceed that on a real project. The result is a kill partway through the test task, with nothing in the log mentioning memory.

Diagnosis, in order.

Read the tail of the log for an abrupt stop rather than an error. A stack trace means an application failure; truncation mid-output means the process was terminated externally.

Add memory reporting to the step so you have evidence rather than a theory. Print the cgroup memory limit and peak usage at the end of the script. This turns "we think it is memory" into a number you can act on.

Count the services and multiply. Every entry in the services list, including docker, takes its allocation whether or not the build uses it. A docker service left in place after the step stopped building images is pure loss.

Check for a JVM or toolchain with no explicit heap limit. A JVM sizes its default heap from what it perceives as available memory, and in a constrained container that perception can be wrong in the unhelpful direction.

Fixes, in the order you should try them.

Remove services the step does not use. This is free and it is the most common win.

Size the ones you keep. A Postgres serving a handful of integration tests does not need 1024 MB:

\`\`\`yaml
definitions:
  services:
    postgres:
      image: postgres:16
      memory: 512
      variables:
        POSTGRES_PASSWORD: dev
\`\`\`

Split the step. Unit tests need no database; integration tests need the database but not the Docker service. Two 1x steps are often cheaper and faster than one 2x step, because they can run in parallel and 2x consumes twice the build minutes.

Then, and only then, increase the size. 2x doubles the memory, and sizes above that go up to 32x with 4x and above additionally granting dedicated CPUs and more disk. Note the cost is explicit and linear: a 4x step uses four times the build minutes of a 1x step. Increasing size to mask three unused services is the expensive wrong answer.

Constrain the toolchain explicitly. Set the JVM heap, cap compiler parallelism to a fixed number rather than the reported processor count — because that count does not reflect your memory — and set the test runner's worker count deliberately.

One detail worth knowing for self-hosted runners: size has no effect on shell-based runners such as Windows PowerShell, macOS shell, and Linux shell runners, which use all available resources on the host machine. The size property only means something on Bitbucket Cloud infrastructure and Linux Docker runners.

The general lesson to state in an interview: this is a shared budget, not a per-container one, and every service you attach is subtracted from the compiler's share before the build starts.`,
      },
      {
        question: 'Design a Bitbucket pipeline for a native application that must build on Linux and Windows, sign on macOS, deploy to staging automatically, and require approval for production.',
        answer: `This exercises most of the product at once: runners for the platform-specific work, artifacts for handoff, deployments for environments, OIDC for credentials, and anchors for reuse.

\`\`\`yaml
image: python:3.12-slim

definitions:
  caches:
    uvcache: ~/.cache/uv
  steps:
    - step: &unit-tests
        name: Unit tests
        caches: [uvcache]
        script:
          - uv sync --frozen
          - uv run pytest -q --junitxml=test-reports/results.xml
        artifacts:
          - test-reports/**

pipelines:
  pull-requests:
    '**':
      - step: *unit-tests
      - step:
          name: Build (Linux)
          size: 2x
          script:
            - uv sync --frozen
            - uv run buildtool compile --platform linux-x64

  branches:
    main:
      - step: *unit-tests
      - parallel:
          - step:
              name: Build Linux
              size: 2x
              script:
                - uv run buildtool compile --platform linux-x64
              artifacts:
                - dist/linux/**
          - step:
              name: Build Windows
              runs-on:
                - self.hosted
                - windows
              script:
                - pwsh -NoProfile -File ./ci/build.ps1
              artifacts:
                - dist/windows/**
      - step:
          name: Sign and notarize (macOS)
          runs-on:
            - self.hosted
            - macos
          script:
            - ./ci/sign-and-notarize.sh
          artifacts:
            - dist/signed/**
      - step:
          name: Deploy staging
          deployment: staging
          oidc: true
          script:
            - ./ci/assume-role.sh
            - uv run buildtool publish --channel staging

  tags:
    'v*':
      - step:
          name: Promote to production
          deployment: production
          trigger: manual
          oidc: true
          script:
            - ./ci/assume-role.sh
            - uv run buildtool publish --channel production
\`\`\`

The decisions worth defending.

Runners for the platform-specific steps. Bitbucket's cloud images are Linux containers. macOS code signing and notarisation require real macOS with a keychain and Apple credentials, and cannot run in a Linux container at all. Windows SDK builds are the same story. Self-hosted runners with runs-on labels are the only route, and the pipeline stays one definition rather than fragmenting across systems. A useful secondary benefit: self-hosted runner time is not charged against build minutes.

The labels matter operationally. A step runs on the next available runner carrying all the listed labels, and if no online runner matches every label the step fails rather than falling back. So the label set is a hard contract — keep it minimal and meaningful, and monitor runner availability, because an offline macOS runner is a failed release rather than a slow one.

Parallel for the two independent builds. Linux and Windows have no dependency on each other, so they run concurrently and the wall clock is the slower of the two rather than the sum. Both consume build minutes independently, which is the tradeoff to state explicitly: parallelism buys latency with money.

Artifacts, not caches, for the binaries. The signing step must receive exactly the binaries this run produced. A cache would eventually hand it a stale build and sign it — producing a correctly signed wrong artifact, which is close to the worst possible outcome in a release pipeline.

A deployment property on the environment-targeting steps. This unlocks deployment-scoped variables, so staging and production credentials and endpoints differ with no branching in the script, and it populates the Deployments view so there is a queryable record of what is where.

A manual trigger on production, keyed to a tag. Production requires a human action and only runs for a tag matching the version pattern. Combined with environment-level restrictions on who may deploy, that is the approval gate. Auto-deploying staging on every merge to main keeps the feedback loop fast where it is safe.

OIDC instead of stored keys. The step receives a signed token, and the cloud provider is configured to trust the Bitbucket identity provider URL and audience, so a web-identity role assumption yields short-lived credentials. Nothing long-lived is stored and there is nothing to rotate when someone leaves.

The YAML anchor for unit tests. The same step definition serves both the pull request pipeline and the main pipeline. Without the anchor these drift, and a check that runs on pull requests but not on main is exactly how a broken main happens.

What to flag as a limitation, unprompted. There is no native matrix strategy here. Two platforms is fine written out; twelve is not, and at that point you generate the YAML from a script and commit it, or collapse the fan-out into a single step that loops internally. Also keep an eye on the 100-step cap per pipeline, which a generated fan-out can approach faster than you expect. Saying this before being asked signals that you know the product's actual shape rather than just its marketing.`,
      },
      {
        question: 'How do variables, secured variables, and OIDC work in Bitbucket Pipelines, and how do you get cloud credentials out of the repository?',
        answer: `Three scopes, one documented precedence order, and one modern replacement for the whole problem.

Scopes. Workspace variables apply to every repository in the workspace, which suits a registry hostname or an organisation-wide setting. Repository variables apply to one repository. Deployment variables apply only to steps carrying that deployment name, which is what lets one pipeline definition target staging and production with different values and no conditional logic.

The documented order of overrides is pipeline over deployment over repository over workspace over default variables. So a value set at deployment scope wins over the same name at repository scope, and a value supplied when triggering a custom pipeline wins over everything.

Default variables are the ones Bitbucket provides. The ones you use constantly: the commit hash that kicked off the build, the source branch (available only on branch builds), the build number which increments with each build, the absolute path of the directory the repository is cloned into, the pull request identifier, the workspace name, the repository slug, and the step UUID.

Secured variables are marked secured in the interface, which makes them unreadable afterwards and masks them in logs. The documented behaviour is that Pipelines masks secured variables so they are not disclosed to team members viewing build logs, replacing a matching value with the variable name. Two documented constraints are worth knowing: secured variables cannot be templated in YAML files, and they are not supported for passing to child pipelines.

The important caveat on masking, and the one an interviewer is listening for: masking matches values, not intent. Bitbucket documents that masking applies to all occurrences including URL-encoded forms, but if your script base64-encodes a secret, splits it, or otherwise transforms it, the transformed form does not match and is printed in the clear. Masking is a safety net against accidental echo, not a control to rely on. The real control is never putting the value on a log path at all.

Now the better answer to the whole category: stop storing cloud credentials.

OIDC lets a pipeline step prove its identity to a cloud provider and exchange that proof for short-lived credentials. You set oidc to true on the step, and Bitbucket makes a signed token available in the step OIDC token variable, described in the documentation as the ID token generated by the Bitbucket OIDC provider.

\`\`\`yaml
- step:
    name: Deploy
    deployment: production
    oidc: true
    script:
      - export AWS_ROLE_ARN="arn:aws:iam::123456789012:role/bitbucket-deploy"
      - echo $BITBUCKET_STEP_OIDC_TOKEN > /tmp/web-identity-token
      - >
        aws sts assume-role-with-web-identity
        --role-arn "$AWS_ROLE_ARN"
        --role-session-name "bb-$BITBUCKET_BUILD_NUMBER"
        --web-identity-token file:///tmp/web-identity-token
        --duration-seconds 3600 > /tmp/creds.json
      - ./ci/export-creds.sh /tmp/creds.json
      - uv run buildtool publish
\`\`\`

The provider-side setup is where the security actually lives. In the repository's Pipelines settings you find the identity provider URL and the audience; you register that URL as an OIDC identity provider on the cloud side and create a role whose trust policy accepts it. Bitbucket supports declaring custom audiences, documented with a maximum of 10 audiences and a maximum audience name length of 150 characters.

The condition on that trust policy is the part people get wrong. If you trust the identity provider without constraining the subject claim, any repository in your workspace can assume the role. The trust policy must pin the specific repository — and ideally the specific deployment environment — so that a new repository created by anyone in the workspace does not silently inherit production access. Bitbucket surfaces an example token payload in the settings interface precisely so you can copy the correct identifiers into the provider configuration; use it rather than guessing the claim format.

What this buys you: no long-lived key exists anywhere, so there is nothing to rotate, nothing to leak in a log, and nothing that survives an employee leaving. Credentials expire within the hour. And the cloud audit log records which repository and which pipeline assumed the role, which is a materially better forensic story than a shared access key used by everything in the organisation.

The migration path is boring and safe: add OIDC alongside the existing key, confirm the OIDC path works in staging, cut production over, then delete the stored key. Deleting first is how you discover which forgotten job was quietly using it.`,
      },
      {
        question: 'Compare Bitbucket Pipelines honestly with GitHub Actions and GitLab CI. Where is it genuinely weaker?',
        answer: `The honest comparison is the point of this question — an answer that only praises the tool named in the job description is a bad signal.

Where Bitbucket Pipelines is genuinely good.

Simplicity. One file, one model, container per step. There is very little to learn and very little that behaves surprisingly once you have the container model. GitHub Actions by comparison has a large surface — workflow syntax, actions, composite actions, reusable workflows, and a permissions model — and much of that is real complexity you have to hold in your head.

Atlassian integration. If the organisation runs Jira, the link between commits, branches, pipelines, and issues is native and genuinely useful. Deployments show up against Jira issues without additional wiring.

The deployment environment model. A deployment property on a step, environment-scoped variables, manual triggers, and a tracked view of what is deployed where is a clean, coherent story that works out of the box rather than requiring assembly.

Where it is genuinely weaker, which is the substance of the answer.

Reusable components. This is the big one. GitHub Actions has an enormous marketplace plus composite actions and reusable workflows, so common logic — set up a language, cache a toolchain, publish a release — is a one-line reference to something maintained by someone else. Bitbucket's equivalent is Pipes: Docker containers invoked with a pipe property and a variables block. The mechanism is fine; the catalogue is a small fraction of the size, and there is nothing equivalent to a reusable workflow. In practice you write more yourself and share it with YAML anchors within a repository or private Pipes across a workspace.

No native matrix strategy. GitHub Actions has a matrix strategy and GitLab has a parallel matrix; both expand a job across a product of dimensions and both support dynamic generation. Bitbucket has parallel steps that you write out individually, within a 100-step-per-pipeline cap. Two platforms is fine. Three platforms times four toolchain versions is twelve hand-written steps, and the practical answer becomes generating the YAML from a script and committing it — which works, but it is machinery you had to build and now maintain.

Weaker pipeline-as-code composition. GitLab lets you include other YAML files, including from other repositories, and build a layered pipeline library. GitHub has reusable workflows. Bitbucket keeps everything in one file per repository, so cross-repository standardisation is a template-and-copy problem rather than an include problem, and drift is the default outcome.

Less control over caching. GitLab exposes cache keys, policies for pull versus push, and fallback keys. Bitbucket gives you a path and an optional file-based key, with a 1 GB compressed ceiling and a one-week expiry you do not control. It is adequate; it is not tunable.

Ecosystem around runners. GitHub's story — larger hosted runners, ARM images, GPU options, autoscaling controllers — is broader. Bitbucket runners work well and their minutes are not charged, which is a genuine advantage, but the surrounding tooling ecosystem is smaller.

Build minutes as a design constraint. All three meter compute, but in Bitbucket it is visible enough that teams design around it, and the size multipliers make it explicit — a 4x step consumes four times the minutes of a 1x step. It becomes a genuine engineering input: whether to parallelise, how aggressively to cache, whether to run the full matrix on every pull request or only nightly, and whether to move heavy work onto self-hosted runners where minutes are free. That is not a flaw so much as a constraint you should acknowledge you plan around.

The concluding judgement. If you are choosing greenfield with no Atlassian commitment, GitHub Actions has the strongest ecosystem and GitLab CI the most composable pipeline model. If the organisation is on Bitbucket, Pipelines is entirely capable of running a serious release pipeline — the gap is reusability, not capability, and you close it with private Pipes, YAML anchors, and pushing logic down into a tested build CLI rather than up into the YAML. That last point is the connection an interviewer will appreciate: the thinner your CI system's reuse story, the more valuable it is that your build logic lives in a packaged, tested tool any CI system can invoke in one line.`,
      },
    ],
    references: [
      'https://support.atlassian.com/bitbucket-cloud/docs/step-options/',
      'https://support.atlassian.com/bitbucket-cloud/docs/cache-dependencies/',
      'https://support.atlassian.com/bitbucket-cloud/docs/databases-and-service-containers/',
      'https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/',
      'https://support.atlassian.com/bitbucket-cloud/docs/integrate-pipelines-with-resource-servers-using-oidc/',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 22. Native Artifact Signing and Release
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'nb-native-signing',
    title: 'Native Artifact Signing and Release',
    icon: 'lock',
    color: '#ea580c',
    questions: 5,
    description: 'Signing application binaries for Windows, macOS, and Linux: Authenticode and timestamping, hardware-backed keys after the 2023 CA/Browser Forum rules, codesign and notarization, and doing all of it in CI without a private key ever touching a build agent.',
    visualizations: [
      {
        title: 'Three operating systems, three trust models, one signing service',
        image: '/diagrams/devops/nb-22-native-signing.png',
        description: `Signing a container image and signing a native binary are different problems. A container signature is a detached attestation in a registry, verified by something you deployed and configured — an admission controller, a policy engine. Nothing in the operating system cares. A native binary signature is embedded in the file, and it is checked by the operating system itself, before your code runs, on a machine you do not administer. You cannot deploy a policy to your users' laptops. If the signature is wrong the user sees a frightening dialog or nothing happens at all, and you find out from support tickets.

Windows. Authenticode embeds a PKCS#7 signature in the certificate table of a PE file — executables, DLLs, drivers, MSIs, catalogs, and PowerShell scripts. signtool.exe from the Windows SDK does the work:

\`\`\`console
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a MyApp.exe
signtool verify /pa /v MyApp.exe
\`\`\`

/fd is the file digest algorithm and /td the timestamp digest algorithm. Both are effectively mandatory now — Microsoft documents that Windows SDK, HLK, WDK, and ADK builds 20236 and later require the file digest option when signing and the timestamp digest option when timestamping, initially as a warning and as an error in later versions, with SHA256 recommended over SHA1. /tr specifies an RFC 3161 timestamp server and cannot be combined with the older /t. /a automatically selects the best signing certificate, choosing the one valid for the longest time when several match. On verify, /pa selects the Default Authentication Verification Policy — without it signtool uses the Windows Driver Verification Policy and will report a perfectly good application signature as invalid, which is a confusing first experience. signtool returns 0 on success, 1 on failure, and 2 on completion with warnings, so an exit-code check must treat 2 deliberately rather than ignoring it.

Timestamping is the detail that decides whether your release survives. A code-signing certificate is valid for a bounded period, and Microsoft documents that if the timestamp option is omitted the signed file simply is not time stamped. Without a countersigned timestamp every copy of your binary stops verifying the moment the certificate expires — including builds shipped years ago onto machines that will never be updated. With a timestamp the signature asserts it was made while the certificate was valid, and it keeps verifying afterwards. Untimestamped releases are a dormant outage with a known trigger date.

The key storage rules changed materially. Effective June 1, 2023, the CA/Browser Forum Code Signing Baseline Requirements require that the subscriber's private key be generated, stored, and used in a suitable hardware crypto module meeting or exceeding the specified requirements — FIPS 140-2 Level 2 or equivalent as the baseline. That applies to OV certificates as well as EV, and it ended the era of a .pfx file in a secrets store. Certificate lifetimes tightened too: effective March 1, 2026, code signing certificates cannot exceed 460 days of validity, so renewal is now an annual operational event.

Microsoft's managed answer is the Azure signing service — originally Trusted Signing, now documented as Artifact Signing — which provides zero-touch certificate lifecycle management inside FIPS 140-3 Level 3 certified HSMs and content-confidential signing where the file never leaves your endpoint and only the digest is signed. It plugs into signtool through /dlib, which specifies a DLL implementing the Authenticode digest signing function and which Microsoft documents as equivalent to the separate digest-generate, sign, and ingest options invoked as one atomic operation.

macOS. The chain is codesign, then notarize, then staple. You sign with a Developer ID Application certificate, with the hardened runtime option enabled and a secure timestamp requested — both are prerequisites for notarization. Nested code is signed inside-out: frameworks and helper tools first, the outer bundle last, because signing the outer bundle seals a hash of everything within it. Apple's guidance is against relying on the deep option for signing, since it does not apply entitlements correctly to nested code.

Notarization is a separate step and a different kind of check: you upload the artifact, an automated Apple service scans it for malicious content and validates the signature, and it returns a ticket. The notarytool submit command with a wait option performs the upload and blocks for the result, and its log subcommand retrieves the per-file reasons when it fails. altool, the previous tool, has been retired.

Stapling attaches the ticket to the artifact so Gatekeeper can verify offline. Without it a user launching your app on an aeroplane or behind a restrictive proxy gets a failure, because Gatekeeper had to look the ticket up online and could not.

Linux has no comparable OS-enforced model. Nothing checks the signature on an arbitrary ELF binary before executing it. Trust lives at the package layer: GPG-signed RPMs and DEBs, signed repository metadata, and clients configured to check signatures. IMA and EVM exist for kernel-enforced file integrity but are rare outside high-assurance deployments. The practical consequence is that on Linux your distribution channel is your trust boundary.

The CI problem is common to all three. A signing key a build agent can read is a signing key any code running on that agent can use, including a compromised dependency. The pattern that holds up is a dedicated signing service: build agents produce unsigned artifacts and request a signature; the service holds keys in an HSM or KMS, authenticates the caller with short-lived federated credentials rather than a stored secret, applies policy about what may be signed, and writes an audit entry for every operation.`,
      },
      {
        title: 'Quick-fire interview answers — native signing',
        description: `Q: Why does signing a native binary differ from signing a container image?
A: A container signature is detached, stored in a registry, and verified by infrastructure you control — an admission controller you configured. A native signature is embedded in the file and verified by the operating system on a machine you do not administer, before your code runs. You cannot push policy to your users, so getting it wrong is a support incident rather than a deployment failure.

Q: What happens if you sign without a timestamp?
A: The signature stops verifying the day the certificate expires, including on copies shipped years earlier to machines that will never be updated. A countersigned timestamp asserts the signature was made while the certificate was valid, so it keeps verifying afterwards. Microsoft documents plainly that without the timestamp option the file simply is not time stamped.

Q: What changed for code-signing keys in 2023?
A: Effective June 1, 2023, the CA/Browser Forum Code Signing Baseline Requirements require the subscriber private key to be generated, stored, and used in a suitable hardware crypto module meeting at least FIPS 140-2 Level 2 or equivalent. This applies to OV as well as EV certificates and ended the practice of storing a .pfx in a secrets manager. Certificate validity is also capped at 460 days for certificates issued on or after March 1, 2026.

Q: Is a notarized macOS app the same as a signed one?
A: No, they are two separate checks. Signing proves who built it, using a Developer ID certificate. Notarization means Apple scanned the artifact and issued a ticket. Gatekeeper wants both. Notarization additionally requires the hardened runtime and a secure timestamp, so a plain codesign without them is rejected at submission.

Q: Why staple the notarization ticket?
A: So Gatekeeper can verify without network access. Without stapling, first launch requires an online ticket lookup, which fails offline or behind a restrictive proxy — the archetypal works-everywhere-except-at-the-customer bug. Stapling attaches the ticket to the app, disk image, or installer package.

Q: How do you sign in CI without exposing the private key?
A: Never put the key on the agent. Use a signing service or cloud KMS where the agent sends a digest and receives a signature, authenticated with short-lived federated credentials rather than a stored secret. Keys stay in an HSM, the service enforces policy about what may be signed, and every operation is logged. On Windows this is exactly what signtool with the /dlib option and a cloud signing provider does natively.`,
      },
    ],
    introduction: `Every desktop and embedded product eventually runs into this. The build works, the tests pass, and then Windows SmartScreen warns users away from the installer, or macOS refuses to open the application at all, or an enterprise customer asks for the signing chain before they will deploy it. Signing is not a security nicety on native software; it is the difference between a product that installs and a product that does not.

It is also a genuinely different problem from container signing, and conflating the two is the most common way to answer this badly. Sigstore, cosign, and SLSA provenance solve supply-chain attestation for artifacts consumed by infrastructure you control: an admission controller checks a signature against a policy you wrote and deployed. That model does not transfer. A native binary is checked by the operating system on a stranger's machine, before your code runs, with no configuration you can influence. There is no policy to deploy and no fallback path.

Each platform enforces this differently, and the differences are substantive. Windows uses Authenticode, embedding a PKCS#7 signature in the PE structure, verified at load and install time and surfaced to users through SmartScreen reputation — where an unrecognised signer produces a warning even when the signature is perfectly valid. macOS uses codesign plus notarization plus stapling, with Gatekeeper enforcing on first launch and the hardened runtime constraining what the process may do at runtime. Linux has essentially no OS-enforced model for arbitrary binaries; trust is delegated entirely to the package manager and its signed repository metadata.

The operational rules changed recently enough that stale knowledge is a real risk in an interview. Effective June 1, 2023, the CA/Browser Forum Code Signing Baseline Requirements require subscriber private keys to be generated, stored, and used in a hardware crypto module meeting or exceeding FIPS 140-2 Level 2 or equivalent — for OV certificates as well as EV. The file-based certificate workflow is simply no longer available, and anyone describing it as current practice is describing something that stopped being issued years ago. Lifetimes have tightened too, capped at 460 days for certificates issued on or after March 1, 2026.

That constraint pushed everyone toward the architecture that was already correct: a dedicated signing service. Build agents produce unsigned artifacts and request signatures. Keys live in an HSM or cloud KMS and never leave it. Authentication uses short-lived federated credentials rather than a stored secret. Policy decides what may be signed and by whom, and an audit log records every operation. This is what makes a signature meaningful rather than ceremonial — it is a statement that a specific pipeline built a specific artifact, and that is only worth anything if the key could not have been used by anything else.

Two adjacent practices complete the picture and interviewers do ask about both. Reproducible builds — deterministic output from identical inputs — make a signature independently verifiable, because a third party can rebuild and compare rather than simply trusting you. And an SBOM in SPDX or CycloneDX format answers the question your signature cannot: what is actually inside this binary, and which of it is now known to be vulnerable. Related topics cover UEFI Secure Boot and kernel module signing, and the SLSA, Sigstore, and cosign container story; this one stays on application binaries you ship to end users.`,
    whenToUse: [
      'Shipping any desktop or command-line application to end users on Windows or macOS, where unsigned software is warned against or blocked by default',
      'Distributing installers, updaters, or drivers where the operating system enforces signature checks before execution',
      'Enterprise customers requiring a verifiable signing chain, an audit trail, and an SBOM before they will approve a deployment',
      'Migrating from file-based certificates to HSM or cloud signing after the 2023 hardware key storage requirement',
      'Building a release pipeline where the signing key must never be readable by a build agent or a compromised dependency',
    ],
    keyConcepts: [
      {
        term: 'Authenticode',
        definition: 'The Windows code signing format. A PKCS#7 signature is embedded in the certificate table of a PE file — executables, DLLs, drivers, MSIs, catalogs, and PowerShell scripts. signtool.exe signs, timestamps, and verifies it, returning 0 on success, 1 on failure, and 2 on completion with warnings.',
      },
      {
        term: 'RFC 3161 timestamping',
        definition: 'A countersignature asserting the signing time from a trusted authority, applied with signtool using the RFC 3161 timestamp URL option together with a timestamp digest algorithm. Without it the signature becomes invalid when the certificate expires, retroactively breaking every copy already shipped. The legacy timestamp option cannot be combined with it.',
      },
      {
        term: 'Hardware key storage requirement',
        definition: 'Effective June 1, 2023, the CA/Browser Forum Code Signing Baseline Requirements require the subscriber private key to be generated, stored, and used in a suitable hardware crypto module meeting or exceeding FIPS 140-2 Level 2 or equivalent. Applies to OV and EV alike, and is satisfied by an HSM, a hardware token, or a qualified cloud signing service.',
      },
      {
        term: 'EV versus OV',
        definition: 'Both now require hardware key protection. EV involves stricter organisation vetting and historically grants immediate SmartScreen reputation, whereas an OV signer must accumulate reputation through download volume. Kernel-mode driver signing is a separate regime requiring attestation signing through Microsoft Partner Center.',
      },
      {
        term: 'Hardened Runtime',
        definition: 'A macOS opt-in enabled through a codesign option that restricts the process — no unsigned executable memory, no arbitrary dynamic-linker environment variables, library validation enforced. It is required for notarization, and narrow entitlements in the com.apple.security.cs namespace grant specific exceptions such as allowing a just-in-time compiler.',
      },
      {
        term: 'Notarization and stapling',
        definition: 'The notarytool submit command uploads the artifact to Apple, which scans it and issues a ticket; a wait option blocks for the result and the log subcommand explains failures. The stapler tool then attaches the ticket to the app, disk image, or installer package so Gatekeeper can verify offline.',
      },
      {
        term: 'Digest signing',
        definition: 'The client hashes the artifact and sends only the digest to the signing service, which returns a signature. The artifact never leaves the build machine and the key never leaves the HSM. On Windows this is what the signtool /dlib option performs, combining digest generation, signing, and ingestion into one atomic operation.',
      },
      {
        term: 'Reproducible build',
        definition: 'A build producing bit-identical output from identical inputs, typically requiring a fixed source date for embedded timestamps, sorted inputs, stripped build paths, and a pinned toolchain. It lets an independent party rebuild and compare, turning a signature from a claim about identity into a verifiable claim about content.',
      },
    ],
    approach: [
      'Enumerate every artifact that reaches a user — executables, libraries, installers, updaters, scripts, helper tools — because one unsigned nested binary fails the whole bundle on macOS and undermines the signature on Windows',
      'Obtain certificates with hardware-backed keys via an HSM, a token, or a cloud signing service, since file-based certificates are no longer issuable under the current baseline requirements',
      'Build or adopt a signing service so agents send digests and receive signatures, and no agent ever holds key material',
      'Authenticate the signing path with short-lived federated credentials from CI rather than a stored secret, scoping the trust policy to the specific repository and environment',
      'Make timestamping non-optional on Windows and the hardened runtime plus secure timestamp non-optional on macOS, enforced in the signing wrapper rather than left as a flag someone can forget',
      'Sign macOS bundles inside-out — nested frameworks and helpers first, outer bundle last — then notarize with a blocking submit and staple the returned ticket',
      'Verify in CI as a gate: signtool verify with the default authentication policy on Windows, a deep strict codesign verify plus a Gatekeeper assessment on macOS, and fail the pipeline on any unexpected exit code',
      'Generate an SBOM alongside each signed artifact and store both with the release, so a future vulnerability disclosure is answered from records rather than archaeology',
    ],
    pitfalls: [
      'Signing without a timestamp, which schedules an outage for the day the certificate expires and retroactively invalidates every copy already in the field',
      'Storing a .pfx or .p12 in a CI secret store — no longer permitted under the current baseline requirements, and readable by anything that runs on the agent',
      'Signing only the top-level executable and leaving nested libraries, helper tools, or frameworks unsigned, which fails macOS verification outright',
      'Relying on the codesign deep option to sign nested code, which Apple advises against because it does not apply entitlements correctly to the nested items',
      'Notarizing but not stapling, so first launch requires an online ticket lookup and fails for offline or proxied users while working perfectly in every test you ran',
      'Treating the signature as a content guarantee when builds are not reproducible — it proves who signed, not that the binary corresponds to the source anyone reviewed',
    ],
    keyQuestions: [
      {
        question: 'Walk through signing a Windows application end to end in CI, without the private key ever reaching a build agent.',
        answer: `Start with what the certificate looks like now, because this is where stale answers get caught.

Effective June 1, 2023, the CA/Browser Forum Code Signing Baseline Requirements mandate that the subscriber's private key be generated, stored, and used in a suitable hardware crypto module — FIPS 140-2 Level 2 or equivalent as the floor. That applies to OV certificates as well as EV. You cannot obtain a certificate whose key you can copy into a CI secret. Lifetimes tightened as well: certificates issued on or after March 1, 2026 cannot exceed 460 days of validity, so renewal is an annual operational event rather than something you do every three years and forget.

That leaves three viable shapes. A managed cloud signing service such as the Azure offering — originally Trusted Signing, now documented as Artifact Signing — which provides zero-touch certificate lifecycle management inside FIPS 140-3 Level 3 certified HSMs. A cloud KMS or dedicated HSM you operate, fronted by your own signing service. Or a physical token, which does not automate and therefore does not belong in CI.

The key insight for the CI design is that signing requires neither the artifact nor the key to travel. Only a digest moves. signtool supports this directly through the /dlib option, which specifies a DLL implementing the Authenticode digest signing function; Microsoft documents it as equivalent to using the digest-generate, digest-sign, and digest-ingest options together, invoked as one atomic operation. The file stays on the agent, the digest goes to the service, the signature comes back and is ingested. Azure's service describes this as content-confidential signing — your file never leaves your endpoint.

The pipeline:

\`\`\`yaml
- step:
    name: Sign Windows artifacts
    runs-on: [self.hosted, windows]
    oidc: true
    script:
      - pwsh -NoProfile -File ./ci/sign-windows.ps1
\`\`\`

\`\`\`powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Federated login: the OIDC token is exchanged for a short-lived credential.
# No client secret, no certificate file, nothing persistent on the agent.
az login --service-principal \`
    --username $env:AZURE_CLIENT_ID \`
    --tenant   $env:AZURE_TENANT_ID \`
    --federated-token $env:BITBUCKET_STEP_OIDC_TOKEN | Out-Null

$signtool = "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.22621.0\\x64\\signtool.exe"
$dlib     = "C:\\signing\\client\\bin\\x64\\Azure.CodeSigning.Dlib.dll"

$targets = Get-ChildItem -Path dist -Include *.exe,*.dll -Recurse

foreach ($t in $targets) {
    & $signtool sign /v /fd SHA256 \`
        /tr http://timestamp.acs.microsoft.com /td SHA256 \`
        /dlib $dlib /dmdf .\\signing-metadata.json \`
        $t.FullName
    if ($LASTEXITCODE -ne 0) { throw "signing failed for $($t.Name) with $LASTEXITCODE" }
}

foreach ($t in $targets) {
    & $signtool verify /pa /v $t.FullName
    if ($LASTEXITCODE -ne 0) { throw "verification failed for $($t.Name)" }
}
\`\`\`

The details that matter, and that an interviewer will probe.

The file digest and timestamp digest algorithms are both required, not optional. Microsoft documents that Windows SDK, HLK, WDK, and ADK builds 20236 and later require the file digest option when signing and the timestamp digest option when timestamping — initially a warning with error code 0, an error in later versions — and recommends SHA256 as more secure than SHA1.

Use the RFC 3161 timestamp option rather than the legacy one. The two cannot be combined, and Microsoft documents that if neither is specified the signed file is not time stamped at all. Timestamping is what keeps every already-shipped copy verifying after the certificate expires, and with 460-day certificates that expiry is never far away.

Sign every PE, not just the entry point. Libraries, helper executables, and bundled tools. An installer whose payload is unsigned still triggers warnings, and enterprise inventory tooling flags the unsigned components during procurement review.

Verify with the default authentication policy option. Without it signtool applies the Windows Driver Verification Policy and will report a good application signature as invalid. This trips up almost everyone the first time and sends them looking for a signing bug that does not exist.

Check the exit code after every call, and know that signtool returns 0 for success, 1 for failure, and 2 for completion with warnings. Treating any non-zero as fatal is the safe default; treating only 1 as fatal silently accepts warning states you probably want to see.

Federated credentials rather than a stored secret. The OIDC token is minted per step and expires in minutes. There is no client secret in the repository to leak, rotate, or inherit when someone leaves.

The remaining piece is SmartScreen. A valid signature is necessary but not sufficient — reputation accrues per signing identity, so a newly issued OV certificate produces warnings until enough clean downloads accumulate, while EV historically grants that reputation immediately. Practically this means treating a certificate identity change as a release-risk event and not rotating right before a major launch.`,
      },
      {
        question: 'Explain the full macOS chain: signing, Hardened Runtime, notarization, and stapling. What breaks at each stage?',
        answer: `Four distinct mechanisms, commonly collapsed into the word signing, and each fails in its own way.

Stage one, code signing. You sign with a Developer ID Application certificate — the one for distribution outside the App Store. Apple Development certificates work only on registered devices; using one for a public build produces an app that runs on your machine and nowhere else, which is a very confusing bug to hit late.

Signing is inside-out. Nested code must be signed before the thing containing it, because signing the outer bundle seals a hash of everything inside:

\`\`\`bash
IDENTITY="Developer ID Application: Example Corp (ABCDE12345)"

# Frameworks, dynamic libraries, and helper tools first
find MyApp.app/Contents/Frameworks -name '*.framework' -o -name '*.dylib' | while read -r item; do
  codesign --force --sign "$IDENTITY" --options runtime --timestamp "$item"
done

# Then the outer bundle, with entitlements
codesign --force --sign "$IDENTITY" \\
  --options runtime \\
  --timestamp \\
  --entitlements ./Entitlements.plist \\
  MyApp.app
\`\`\`

Apple's guidance is against using the deep option as a signing shortcut. It exists and it appears to work, but it does not apply entitlements correctly to nested code, so helpers end up signed without the entitlements they need — and that failure surfaces at runtime, not at signing time, which is the worst place to discover it.

What breaks here: signing with the wrong certificate type; omitting the timestamp, which is required for notarization; and re-signing an outer bundle after modifying anything inside it, which invalidates the seal.

Stage two, the hardened runtime. The runtime option opts the process into a restricted execution environment: no unsigned executable memory, no arbitrary dynamic-linker environment variable injection, and library validation enforced so only libraries signed by you or Apple will load. It is required for notarization.

That last restriction is where real applications break. A just-in-time compiling runtime needs the allow-jit entitlement. An application loading a plugin signed by a third party needs library validation disabled. Each of these is a genuine reduction in security, so the correct posture is to add the narrowest entitlement that makes the app work and be able to justify it, rather than adding the broad ones pre-emptively because a forum post said to.

What breaks here: an app that launched fine in development crashes on first run after the runtime is enabled, because an embedded interpreter or a plugin is now blocked. This is discovered late and feels sudden.

Stage three, notarization. This is not signing. You upload the artifact, an automated Apple service scans it for malicious content and checks that it is properly signed with a Developer ID certificate, the hardened runtime, and a secure timestamp, and it returns a ticket.

\`\`\`bash
# One-time credential storage, preferably an App Store Connect API key
xcrun notarytool store-credentials "notary-profile" \\
  --key ./AuthKey_XXXXXXXX.p8 --key-id XXXXXXXX --issuer "$ISSUER_UUID"

ditto -c -k --keepParent MyApp.app MyApp.zip

xcrun notarytool submit MyApp.zip --keychain-profile "notary-profile" --wait

# On failure, this is where the actual reason lives
xcrun notarytool log <submission-id> --keychain-profile "notary-profile"
\`\`\`

The wait option blocks until Apple returns a result, which is what makes it usable in a pipeline; without it you get a submission identifier and must poll. altool, the predecessor, has been retired, so any script or blog post still referencing it is out of date.

What breaks here: submission is rejected because something nested is unsigned, missing the hardened runtime, or missing a secure timestamp. The top-level status message is nearly useless; the log subcommand gives per-file reasons. Budget for this being iterative on the first attempt for any non-trivial bundle.

Stage four, stapling. Notarization produces a ticket held on Apple's servers. Stapling attaches a copy to the artifact:

\`\`\`bash
xcrun stapler staple MyApp.app
xcrun stapler validate MyApp.app
\`\`\`

Without stapling the app is still notarized, and Gatekeeper looks the ticket up online on first launch — so it works on your machine, on the reviewer's machine, and in every test you run with network access, and fails for a user who is offline or behind a restrictive corporate proxy. That is the archetypal works-everywhere-except-at-the-customer bug. Staple the app bundle, and separately staple the disk image or installer package you actually distribute, since those are distinct artifacts.

Stage five, verification as a CI gate. Do not ship on the assumption it worked:

\`\`\`bash
codesign --verify --deep --strict --verbose=2 MyApp.app
spctl --assess --type execute --verbose=4 MyApp.app
xcrun stapler validate MyApp.dmg
\`\`\`

Note that the deep option is discouraged for signing but is exactly right for verification, because you want to check everything nested. The Gatekeeper assessment is the closest approximation to what a user's machine will do, and it is the check that catches a missing ticket before your customers do.

The summary an interviewer is listening for: signing says who built it, the hardened runtime constrains what it may do, notarization is Apple's scan and ticket, and stapling makes the ticket work offline. All four are required, and each fails differently.`,
      },
      {
        question: 'Design a signing architecture for CI where no build agent can be trusted with a key. What does it enforce, and what does it log?',
        answer: `The threat model first, because it justifies everything else. A build agent runs code from your repository, your dependencies, and your dependencies' dependencies. A malicious package with an install hook, a compromised CI action, or an attacker with commit access all execute with the agent's privileges. Any key the agent can read is a key the attacker can use — and a stolen code-signing key is worse than most breaches, because the attacker can sign malware that your customers' operating systems will trust and install without a warning. Rotating it means revocation, which invalidates good signatures too unless everything was timestamped.

So the requirement is absolute: no build agent ever holds key material. Not in an environment variable, not in a file, not in a keychain it can unlock, not for the duration of a single step.

The architecture that satisfies it.

Agents build unsigned artifacts and never touch keys.

A signing service is the only thing that can reach the keys. It exposes a narrow interface — submit a digest or an artifact reference, receive a signature — and it is the sole policy enforcement point.

Keys live in an HSM or cloud KMS and are non-exportable by construction. This is now mandatory rather than best practice: the CA/Browser Forum requirements since June 1, 2023 mandate hardware crypto module storage at FIPS 140-2 Level 2 or above for code-signing subscriber keys, and the managed cloud services meet it with FIPS 140-3 Level 3 HSMs.

Authentication is federated and short-lived. The agent presents an OIDC token minted for that pipeline step; the service validates the issuer, the audience, and — critically — the subject claim identifying the specific repository and environment. There is no stored secret anywhere in the chain, which means nothing to leak and nothing to rotate.

Only a digest crosses the wire where the format allows it. On Windows this is native: the signtool /dlib option performs digest generation, signing, and ingestion as one atomic operation, so the binary never leaves the agent and the key never leaves the HSM.

The policy the service enforces, which is the part that distinguishes a real design from a key vault with an API.

Who may sign. The OIDC subject must match an allowlist. A pull request pipeline from a fork gets nothing. Production signing identities are reachable only from the tag pipeline in one specific repository.

What may be signed. Reject artifact types the identity is not authorised for. A team authorised to sign application binaries should not be able to sign a kernel driver or an installer for a different product line.

Provenance requirements. Require the request to carry a build attestation — commit hash, pipeline identifier, builder identity — and record it alongside the signature. This is where the container-world concepts genuinely transfer: SLSA-style provenance is as meaningful for a binary as for an image, even though the verification path at the endpoint is entirely different.

Rate and volume limits. A sudden burst of signing requests is a strong compromise signal, and a cap turns a full key compromise into a bounded one.

Human approval for the highest tier. Release signing with a production certificate can require a second party, in the same way production deployment does.

What it logs, for every operation without exception: timestamp; artifact digest before and after; the requesting identity, repository, commit, and pipeline run; the certificate or key identifier used; the policy decision and its reason; and the outcome. Ship those to an append-only store with retention exceeding your certificate lifetime.

The reason the log is not paperwork: when an incident happens, the question is what this key signed and whether any of it was not yours. Without a per-operation log the answer is unbounded and you must revoke everything. With one, you enumerate the signatures, verify each against known builds, and revoke narrowly. That is the difference between a bad week and a product recall.

Two refinements worth mentioning. Separate keys per environment and per product line, so a compromise is contained and revocation is surgical. And ensure everything is timestamped, because timestamped signatures made before a revocation date can remain valid — which is precisely what lets you revoke a compromised key without breaking every legitimate release you have ever shipped.

The honest tradeoff: this is real infrastructure, and for a two-person team shipping one tool it is over-engineered. The minimum viable version is a managed service, which gives you HSM-held keys and cloud identity controls without building anything. The design above is what you grow into when you have multiple products, multiple teams, and a compliance requirement to answer for.`,
      },
      {
        question: 'Why do reproducible builds make signatures meaningful, and how do SBOMs and embedded version metadata fit in?',
        answer: `A signature answers exactly one question: who applied it. That is genuinely useful — it establishes accountability and it is what the operating system checks. But notice what it does not answer. It says nothing about what is inside the artifact, and nothing about whether the artifact corresponds to the source anyone reviewed.

Reproducible builds close the second gap. If the same source, at the same commit, with the same declared toolchain, produces a bit-identical binary, then anyone can rebuild independently and compare hashes. The signature stops being a claim you have to take on faith and becomes a verifiable claim about content. Without reproducibility, a compromised build agent can inject a backdoor and the signing service will sign it, correctly, and every check downstream will pass.

The practical obstacles are mundane and each has a standard fix. Embedded timestamps are the biggest — set a fixed source date derived from the commit and honour it in the build, since most modern toolchains respect that convention. Absolute build paths leak into debug information; strip them with the compiler's path-remapping flags. Filesystem iteration order differs between machines; sort inputs explicitly rather than relying on directory order. Archive metadata carries modification times and ownership; normalise them when creating tarballs. Parallel builds can order object files non-deterministically; pin the link order. And the toolchain itself must be pinned by digest, because a different compiler patch version produces different code.

Signing interacts with this in a way worth stating precisely: the signature is applied after the build and embeds its own timestamp, so two signed copies are not byte-identical even when the unsigned inputs were. That is expected and fine. You verify reproducibility on the unsigned artifact and sign afterwards.

SBOMs answer the first gap — what is inside. For native code this is harder than for a dependency-manager ecosystem, because statically linked third-party code leaves no manifest in the artifact. You generate it from the build rather than from the binary: capture what the build system actually linked, emit it in SPDX or CycloneDX, and attach it to the release alongside the signature.

The value is realised entirely at disclosure time. A vulnerability lands in a compression library. Without an SBOM you are grepping build logs and asking people what they remember, for every version still under support. With one it is a query: which released artifacts contain this component below the fixed version. That is the difference between a same-day customer advisory and a two-week investigation. It is also increasingly a procurement requirement rather than an engineering preference, with US Executive Order 14028 having pushed SBOM expectations into federal software supply requirements.

Version metadata embedded in the binary is the smallest of the three and the most immediately practical. When a customer sends you a crash from a binary they downloaded eighteen months ago, you need to know exactly which build it is.

On Windows a version resource compiled from a resource script carries the file version, product version, company name, and custom string fields — put the commit hash in one of them. On macOS the bundle property list carries a short version string for the user-facing version and a separate build version for the build identifier. On Linux and ELF generally there is no standard equivalent, so the conventions are a build identifier recorded by the linker — which is also what links a stripped binary to its separated debug symbols — plus an embedded version string the binary can print on demand.

The rule that makes all of this coherent: whatever version you embed must be the same identifier that appears in your signing log, your SBOM, and your build provenance record. When those four agree, an incident is a lookup. When they disagree, every question takes a day and the answers are guesses.

The synthesis for an interview: signing establishes who, reproducibility establishes what, the SBOM establishes what is inside, and embedded metadata establishes which build. Any one of them alone leaves an obvious gap, and the gaps are exactly where post-incident investigations stall.`,
      },
      {
        question: 'How does Linux package signing differ, and why is there no Gatekeeper equivalent?',
        answer: `The structural difference is that Linux never had a single vendor to enforce a policy. Windows has Microsoft, macOS has Apple, and both can require signatures for software to run because they control the operating system and its defaults. Linux is dozens of distributions with different package managers, different trust roots, and a strong cultural expectation that the user decides what runs on their machine.

So there is no operating-system-enforced check on an arbitrary ELF binary. Download a binary, make it executable, run it — the kernel does not consult a signature. Nothing warns and nothing blocks. Trust moved to a different layer entirely: the package manager.

RPM signing. Packages are signed with GPG, typically through the rpmsign tool with the signing key name configured as a build macro. Clients verify against imported public keys, and the repository configuration enables signature checking so unsigned or badly signed packages are refused. Repository metadata is signed separately with a detached signature over the metadata index, so an attacker who controls the mirror cannot serve altered metadata pointing at older, vulnerable but validly signed packages — which is otherwise a real downgrade attack.

DEB signing. Debian's model puts the emphasis on the repository rather than the individual package. The release file is signed, either detached or inline, and it contains hashes of the package indices, which in turn contain hashes of the package files. Verifying the release signature therefore covers everything transitively. Individual package signing exists but is rarely relied upon; the trust decision the package manager makes is about the repository.

Both models share a property worth naming: they protect the distribution channel, not the file. A signed package copied out of a repository and handed to someone by other means carries a signature that nothing will check by default. This is the exact inverse of the Windows and macOS model, where the file carries its own trust and the channel is irrelevant.

What that means for you as a vendor shipping Linux software.

Publishing to a repository you sign is the only path that gets automatic verification. Users add your repository and import your key once, and from then on the package manager checks every update. This is what every serious vendor does, and it is worth the operational cost of running a repository.

A bare tarball or a standalone binary from your website gets no verification at all beyond what the user chooses to do manually. You should still publish a detached signature and a checksum file and document how to verify them, while being realistic that most users will not.

Flatpak and Snap have their own signing and sandboxing models, closer to the app-store shape, and they do verify. If your distribution goes through them you are in a genuinely stronger position.

The closest thing to an operating-system-enforced model is IMA and EVM — kernel subsystems that measure and appraise file integrity against signatures stored in extended attributes, refusing to execute files that fail. They exist, they work, and they are essentially absent from general-purpose desktop and server distributions because they require enrolling keys, signing the entire filesystem, and accepting a real operational burden on every update. You see them in high-assurance and regulated deployments, not on a developer laptop. Related topics cover UEFI Secure Boot and kernel module signing, which enforce at boot and module-load time and are a genuinely different problem from application distribution.

The practical consequence for a release engineer supporting all three platforms: your signing pipeline has three shapes, not one. Windows and macOS sign the artifact itself and the operating system enforces. Linux signs the repository and the packages within it, and the package manager enforces — but only for users who installed from your repository. Budget for the fact that your Linux distribution channel is your trust boundary, and that anything shipped outside it is effectively unverified no matter how carefully you signed it.`,
      },
    ],
    references: [
      'https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool',
      'https://cabforum.org/working-groups/code-signing/requirements/',
      'https://learn.microsoft.com/en-us/azure/trusted-signing/overview',
      'https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution',
      'https://reproducible-builds.org/docs/source-date-epoch/',
    ],
  },

];
