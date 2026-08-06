#!/usr/bin/env python3
"""Generate the Native Build Engineering (C/C++) track diagrams.

22 diagrams, one per topic in the 'nativebuild' sub-category of DevOps.
Covers the compilation model, linking, GCC/MSVC toolchains, make/CMake,
cross-compilation, Qt, dependency management, build performance, native
debugging, sanitizers, testing, static analysis, scripting, Bitbucket
Pipelines, and native artifact signing.

Shares the node/edge/graph style of gen-devops-diagrams.py.
Output: apps/camora/public/diagrams/devops/nb-*.png

Aspect-ratio rule: long linear chains use rankdir='TB', wide fan-outs keep
the default 'LR'. Anything past ~3:1 is unreadable at page width.
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'devops')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.22,0.12')
EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'cyan':   ('#cffafe', '#06b6d4', '#155e75'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
    'sky':    ('#e0f2fe', '#0ea5e9', '#075985'),
    'amber':  ('#fef3c7', '#f59e0b', '#92400e'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
    'orange': ('#ffedd5', '#ea580c', '#9a3412'),
}


def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)


def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '',
           color=color, fontcolor=color, style=style, **EDGE)


def base_graph(name, title, rankdir='LR'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.65',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica', fontcolor='#1e293b')
    return g


def save(g, slug):
    g.render(os.path.join(OUT, slug), cleanup=True)
    print(f'Generated: {slug}')


def cluster(g, key, label, color, fontcolor):
    s = g.subgraph(name=f'cluster_{key}')
    return s


# 1 ──────────────────────────────────────────────────────────────────
def d1_compilation_model():
    g = base_graph('nb1', 'The C/C++ compilation model — four phases, one object per TU', 'TB')
    n(g, 'src',  'main.cpp\n#include "widget.h"', 'gray')
    n(g, 'cpp',  'Preprocessor\nexpands #include, macros\nemits one translation unit', 'navy')
    n(g, 'tu',   'Translation unit\nthe real compiler input\n(often 100k+ lines\nafter header expansion)', 'cyan')
    n(g, 'cc',   'Compiler (cc1plus)\nparse · template instantiation\noptimize · codegen', 'purple')
    n(g, 'asm',  'Assembler (as)\ntext asm to machine code', 'teal')
    n(g, 'obj',  'main.o\ndefined + undefined symbols', 'green')
    n(g, 'link', 'Linker\nresolves across all objects', 'gold')
    n(g, 'exe',  'Executable', 'orange')

    e(g, 'src', 'cpp'); e(g, 'cpp', 'tu'); e(g, 'tu', 'cc')
    e(g, 'cc', 'asm'); e(g, 'asm', 'obj'); e(g, 'obj', 'link'); e(g, 'link', 'exe')

    n(g, 'odr',  'One Definition Rule\ndeclarations may repeat,\ndefinitions may not\n(inline/template excepted)', 'amber')
    n(g, 'cost', 'Why builds are slow:\nevery TU re-parses every\nheader it includes.\nN sources x M headers.', 'red')
    n(g, 'fix',  'Cutting the graph:\nforward declarations · pimpl\nprecompiled headers\nC++20 modules', 'green')
    e(g, 'tu',  'cost', '', '#dc2626', 'dotted')
    e(g, 'cost','fix',  '', '#16a34a', 'dashed')
    e(g, 'link','odr',  '', '#94a3b8', 'dotted')
    save(g, 'nb-1-compilation-model')


# 2 ──────────────────────────────────────────────────────────────────
def d2_linking():
    g = base_graph('nb2', 'Linking — symbol resolution, archives, and the runtime loader', 'TB')
    n(g, 'objs', 'Object files\nmain.o util.o\nUNDEF: _Z3foov', 'green')
    n(g, 'ar',   'Static archive libfoo.a\njust a bag of .o files\nlinker pulls ONLY members\nthat resolve a pending UNDEF', 'gold')
    n(g, 'so',   'Shared library libbar.so\nrecorded as DT_NEEDED\nresolved at load time', 'cyan')
    n(g, 'ld',   'Linker (ld / lld / mold)\nleft-to-right single pass\nover the command line', 'purple')
    n(g, 'out',  'Executable\n+ DT_NEEDED list\n+ RPATH/RUNPATH', 'orange')
    n(g, 'ldso', 'ld.so at runtime\nsearch order:\nRPATH → LD_LIBRARY_PATH\n→ RUNPATH → ldconfig cache', 'teal')
    n(g, 'proc', 'Running process', 'navy')

    e(g, 'objs', 'ld'); e(g, 'ar', 'ld'); e(g, 'so', 'ld')
    e(g, 'ld', 'out'); e(g, 'out', 'ldso'); e(g, 'ldso', 'proc')

    n(g, 'order', 'LINK ORDER MATTERS for archives\ngcc main.o -lfoo   works\ngcc -lfoo main.o   undefined reference\n(-lfoo scanned before the UNDEF existed)\nCircular deps: --start-group/--end-group', 'red')
    n(g, 'vis',   'Visibility\n-fvisibility=hidden +\nexplicit __attribute__((visibility("default")))\nsmaller ABI surface, faster load,\nfewer symbol collisions', 'amber')
    e(g, 'ld',  'order', '', '#dc2626', 'dotted')
    e(g, 'out', 'vis',   '', '#f59e0b', 'dotted')
    save(g, 'nb-2-linking')


# 3 ──────────────────────────────────────────────────────────────────
def d3_gcc_toolchain():
    g = base_graph('nb3', 'GCC is a driver — what "g++ main.cpp" actually runs')
    n(g, 'drv',  'g++ (the driver)\nreads spec files,\npicks and sequences the\nreal programs.\nSee it: g++ -v  or  g++ -###', 'orange')
    n(g, 'cc1',  'cc1plus\nthe actual C++ compiler', 'purple')
    n(g, 'as',   'as\nassembler', 'teal')
    n(g, 'c2',   'collect2 → ld\nlinker wrapper\n(handles static ctors)', 'gold')
    n(g, 'out',  'a.out', 'green')
    e(g, 'drv', 'cc1'); e(g, 'cc1', 'as'); e(g, 'as', 'c2'); e(g, 'c2', 'out')

    n(g, 'opt',  'Optimization\n-O0 debug-friendly\n-O1/-O2 production default\n-O3 more inlining/vectorizing\n-Os size · -Ofast breaks IEEE\n-Og best for debugging', 'navy')
    n(g, 'dbg',  'Debug info\n-g DWARF\n-g3 keeps macros\nsize cost is large;\nstrip + keep symbols separately', 'cyan')
    n(g, 'arch', 'Target selection\n-march= what ISA may be emitted\n-mtune= scheduling only\n-march=native is a PORTABILITY TRAP:\nSIGILL on older CPUs in the fleet', 'red')
    n(g, 'warn', 'Warnings\n-Wall -Wextra -Wshadow\n-Werror in CI, not local\nEnabling late costs weeks', 'amber')
    e(g, 'drv', 'opt',  '', '#94a3b8', 'dotted')
    e(g, 'drv', 'dbg',  '', '#94a3b8', 'dotted')
    e(g, 'drv', 'arch', '', '#dc2626', 'dotted')
    e(g, 'drv', 'warn', '', '#94a3b8', 'dotted')
    save(g, 'nb-3-gcc-toolchain')


# 4 ──────────────────────────────────────────────────────────────────
def d4_gcc_upgrades():
    g = base_graph('nb4', 'A GCC upgrade is a platform migration, not a version bump', 'TB')
    n(g, 'old', 'Current toolchain\nGCC N', 'gray')
    n(g, 'risk', 'What actually breaks', 'red')

    n(g, 'abi',  'libstdc++ dual ABI\n_GLIBCXX_USE_CXX11_ABI=0/1\nstd::string / std::list changed at GCC 5.\nMixing ABIs = undefined reference\nto symbols with __cxx11 in the name', 'red')
    n(g, 'werr', 'New warnings under -Werror\nA clean build becomes a red build\non code nobody touched', 'amber')
    n(g, 'std',  'Default -std= moves\nGCC 11 → gnu++17.\nStricter conformance rejects\npreviously-accepted code', 'amber')
    n(g, 'ub',   'UB that changed behaviour\nHigher optimization exploits\nassumptions the old compiler\nhappened not to use', 'red')

    n(g, 'plan', 'Staged rollout', 'green')
    n(g, 's1',  '1. Build both toolchains\nside by side, same source', 'navy')
    n(g, 's2',  '2. Canary a leaf component\nnot the whole tree', 'navy')
    n(g, 's3',  '3. Diff the ABI\nabidiff / abi-compliance-checker', 'cyan')
    n(g, 's4',  '4. Benchmark — an upgrade\ncan regress performance', 'cyan')
    n(g, 's5',  '5. Dual-build period,\nthen cutover, then remove old', 'teal')
    n(g, 'new', 'GCC N+1 fleet-wide', 'orange')

    e(g, 'old', 'risk')
    for x in ('abi', 'werr', 'std', 'ub'):
        e(g, 'risk', x)
    e(g, 'abi', 'plan'); e(g, 'ub', 'plan')
    e(g, 'plan', 's1'); e(g, 's1', 's2'); e(g, 's2', 's3')
    e(g, 's3', 's4'); e(g, 's4', 's5'); e(g, 's5', 'new')

    n(g, 'bisect', 'Compiler regression?\ngit bisect over the BUILD,\nnot the source', 'purple')
    e(g, 's4', 'bisect', '', '#6366f1', 'dashed')
    save(g, 'nb-4-gcc-upgrades')


# 5 ──────────────────────────────────────────────────────────────────
def d5_stdlib_abi():
    g = base_graph('nb5', 'Standard libraries and glibc symbol versioning', 'TB')
    n(g, 'app', 'Your C++ binary', 'orange')
    n(g, 'cxx', 'C++ standard library\nlibstdc++ (GNU) ·\nlibc++ (LLVM) ·\nMSVC STL\nNot ABI-compatible with each other', 'navy')
    n(g, 'abi', 'Itanium C++ ABI\nname mangling · vtable layout ·\nexception tables', 'purple')
    n(g, 'libc','glibc\nsymbol versioning:\nmemcpy@@GLIBC_2.14\nfstat@@GLIBC_2.33', 'teal')
    n(g, 'kern','Linux kernel syscalls\n(stable ABI)', 'gray')
    e(g, 'app', 'cxx'); e(g, 'cxx', 'abi'); e(g, 'cxx', 'libc'); e(g, 'libc', 'kern')

    n(g, 'fail', 'The classic failure\nBuilt on Ubuntu 24.04, run on RHEL 8:\n  version `GLIBC_2.34\' not found\nglibc is FORWARD compatible,\nnever backward.', 'red')
    n(g, 'fix',  'Fixes, in order of preference\n1. Build on the OLDEST glibc you support\n   (manylinux image, RHEL gcc-toolset,\n   or a sysroot)\n2. -static-libstdc++ -static-libgcc\n   (safe: removes the C++ runtime dep)\n3. Fully static — but NSS/getaddrinfo\n   still dlopen at runtime\n4. musl if you truly need portability', 'green')
    e(g, 'libc', 'fail', '', '#dc2626')
    e(g, 'fail', 'fix',  '', '#16a34a', 'dashed')
    save(g, 'nb-5-stdlib-abi')


# 6 ──────────────────────────────────────────────────────────────────
def d6_msvc():
    g = base_graph('nb6', 'MSVC toolchain — cl.exe, link.exe, and the CRT trap', 'TB')
    n(g, 'env', 'Developer environment\nvcvarsall.bat / vswhere\nsets INCLUDE, LIB, PATH.\nCI must call this first.', 'gray')
    n(g, 'cl',  'cl.exe\ncompile → .obj\n/std:c++20 /permissive-\n/W4 /WX  /Zi (PDB)', 'navy')
    n(g, 'link','link.exe\n.obj + .lib → .exe / .dll\n/DEBUG emits the PDB', 'purple')
    n(g, 'out', 'app.exe + app.pdb\nmylib.dll + mylib.lib\n(the .lib beside a DLL is an\nIMPORT library, not code)', 'orange')
    e(g, 'env', 'cl'); e(g, 'cl', 'link'); e(g, 'link', 'out')

    n(g, 'crt', 'CRT selection — the #1 MSVC bug source\n/MD  dynamic release   /MDd dynamic debug\n/MT  static release    /MTd static debug\nEvery module in a process must agree.', 'red')
    n(g, 'heap','Why mismatch crashes\n/MT gives each module its OWN heap.\nnew in the DLL, delete in the EXE\n= free on the wrong heap = corruption.\nRule: allocate and free on the same side,\nor pass ownership across a C ABI.', 'red')
    n(g, 'exp', 'Exporting from a DLL\n__declspec(dllexport) when building,\n__declspec(dllimport) when consuming\n(one macro, flipped by a define)\nor a .def file.\nC++ exports are mangling-sensitive.', 'amber')
    n(g, 'tool','Inspecting\ndumpbin /exports /dependents /headers\nvs. Linux nm / objdump / ldd', 'cyan')
    n(g, 'ver', 'Versioning\nMSVC toolset v143 != VS 2022 version.\nclang-cl is a drop-in front end\nreusing the MSVC ABI + headers.', 'teal')

    e(g, 'link', 'crt', '', '#dc2626')
    e(g, 'crt',  'heap', '', '#dc2626', 'dashed')
    e(g, 'out',  'exp',  '', '#f59e0b', 'dotted')
    e(g, 'out',  'tool', '', '#94a3b8', 'dotted')
    e(g, 'env',  'ver',  '', '#94a3b8', 'dotted')
    save(g, 'nb-6-msvc')


# 7 ──────────────────────────────────────────────────────────────────
def d7_win_vs_posix():
    g = base_graph('nb7', 'Windows and POSIX — the differences that reach your build')
    with g.subgraph(name='cluster_win') as s:
        s.attr(label='  WINDOWS / Win32  ', style='rounded', color='#3b82f6',
               fontcolor='#1e40af', fontname='Helvetica', fontsize='12')
        n(s, 'w1', 'CreateProcess\n(no fork)', 'navy')
        n(s, 'w2', 'Windows threads\nCRITICAL_SECTION · SRWLOCK', 'navy')
        n(s, 'w3', 'LoadLibrary\nGetProcAddress', 'navy')
        n(s, 'w4', 'C:\\ paths · backslash\nMAX_PATH 260 unless opted out\ncase-insensitive', 'navy')
        n(s, 'w5', 'Winsock\nWSAStartup required', 'navy')
        n(s, 'w6', 'Open file cannot be\ndeleted or renamed\n(breaks naive build tools)', 'red')

    with g.subgraph(name='cluster_posix') as s:
        s.attr(label='  LINUX / POSIX  ', style='rounded', color='#22c55e',
               fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'p1', 'fork + exec', 'green')
        n(s, 'p2', 'pthreads\npthread_mutex', 'green')
        n(s, 'p3', 'dlopen\ndlsym', 'green')
        n(s, 'p4', '/ paths · forward slash\nno practical length limit\ncase-sensitive', 'green')
        n(s, 'p5', 'BSD sockets\nno init call', 'green')
        n(s, 'p6', 'Unlink an open file:\nfine. Inode lives until\nthe last fd closes.', 'green')

    n(g, 'std',  'std::thread, std::filesystem,\nstd::mutex hide much of this —\nuntil semantics differ\n(filesystem case, permissions)', 'cyan')
    n(g, 'arch', 'Structure for portability\nIsolate platform code behind an\ninterface in a platform/ directory.\nDo NOT scatter #ifdef _WIN32\nthrough business logic.\nQt/Boost/ASIO if you want it bought.', 'orange')
    e(g, 'w6', 'std', '', '#94a3b8', 'dotted')
    e(g, 'p6', 'std', '', '#94a3b8', 'dotted')
    e(g, 'std', 'arch')
    save(g, 'nb-7-win-vs-posix')


# 8 ──────────────────────────────────────────────────────────────────
def d8_make():
    g = base_graph('nb8', 'GNU Make — the dependency graph and the rebuild decision', 'TB')
    n(g, 'rule', 'A rule is a triple\ntarget : prerequisites\n<TAB> recipe', 'orange')
    n(g, 'graph','Make builds a DAG\nand walks it bottom-up', 'navy')
    n(g, 'ts',   'Rebuild decision is TIMESTAMPS only\nIf any prerequisite is newer than the\ntarget, run the recipe.\nMake does not hash content.', 'purple')
    n(g, 'stale','The classic bug\nYou edit a HEADER. Make does not\nknow main.o depends on it, so it\nrebuilds nothing. You debug a stale binary.', 'red')
    n(g, 'dep',  'The fix: compiler-generated deps\n  CXXFLAGS += -MMD -MP\n  -include $(OBJS:.o=.d)\nThe compiler emits the real header\nlist; make includes it.', 'green')

    e(g, 'rule', 'graph'); e(g, 'graph', 'ts'); e(g, 'ts', 'stale'); e(g, 'stale', 'dep')

    n(g, 'vars', 'Variable flavours\n=  recursive, expanded at USE\n:= simple, expanded at DEFINITION\n?= only if unset   += append\nRecursive expansion of a $(shell ...)\nruns it on every reference.', 'amber')
    n(g, 'auto', 'Automatic variables\n$@ target   $< first prereq\n$^ all prereqs (deduped)\n$? newer-than-target prereqs\n$* pattern stem', 'cyan')
    n(g, 'par',  'Parallelism -j\nExposes every missing dependency.\nAlso breaks on shared temp files\nand non-atomic outputs.\n.NOTPARALLEL is a surrender,\nnot a fix.', 'red')
    n(g, 'phony','Special targets\n.PHONY all clean\n.DELETE_ON_ERROR (delete partial\n  output so the next run retries)\norder-only prereqs: target : a | dir', 'teal')
    n(g, 'rec',  'Recursive Make Considered Harmful\nA sub-make cannot see the whole graph,\nso it cannot parallelise or order\ncorrectly. Prefer one graph via include.', 'gold')
    n(g, 'dbg',  'Debugging\nmake -n dry run\nmake -p dump database\nmake --trace why a rule ran\nmake -d full (verbose)', 'sky')

    e(g, 'dep', 'vars', '', '#94a3b8', 'dotted')
    e(g, 'dep', 'auto', '', '#94a3b8', 'dotted')
    e(g, 'dep', 'par',  '', '#dc2626', 'dotted')
    e(g, 'par', 'phony','', '#94a3b8', 'dotted')
    e(g, 'par', 'rec',  '', '#f59e0b', 'dashed')
    e(g, 'rec', 'dbg',  '', '#94a3b8', 'dotted')
    save(g, 'nb-8-make')


# 9 ──────────────────────────────────────────────────────────────────
def d9_cmake():
    g = base_graph('nb9', 'CMake — two-stage build and target usage requirements', 'TB')
    n(g, 'lists', 'CMakeLists.txt\n+ CMakePresets.json', 'orange')
    n(g, 'conf',  'CONFIGURE stage\nrun CMake language,\nfind_package, feature tests\n→ CMakeCache.txt', 'navy')
    n(g, 'gen',   'GENERATE stage\nemit native build files for\nthe chosen generator', 'purple')
    n(g, 'ninja', 'Ninja / Make /\nVisual Studio / Xcode', 'teal')
    n(g, 'build', 'cmake --build .\n(single entry point,\ngenerator-agnostic)', 'green')
    e(g, 'lists', 'conf'); e(g, 'conf', 'gen'); e(g, 'gen', 'ninja'); e(g, 'ninja', 'build')

    n(g, 'tgt',  'Everything is a TARGET\nadd_library(core ...)\nadd_executable(app ...)\ntarget_link_libraries(app PRIVATE core)', 'cyan')
    n(g, 'usage','Usage requirements — the whole point\nPRIVATE   used to build me, not exposed\nINTERFACE not used by me, exposed to users\nPUBLIC    both\nGet these wrong and either your\nconsumers miss include dirs, or your\ninternal headers leak fleet-wide.', 'amber')
    n(g, 'inst', 'install() + export()\ngenerates a package config so\nfind_package(core CONFIG) gives\nconsumers IMPORTED targets with\nall usage requirements attached', 'sky')
    n(g, 'anti', 'Anti-patterns\ninclude_directories() — directory scoped\nlink_directories() — fragile\nCMAKE_CXX_FLAGS hardcoding\nfile(GLOB) for sources — new files\n  are silently not built\nAll of these predate target-based CMake.', 'red')
    n(g, 'cc',   'compile_commands.json\nCMAKE_EXPORT_COMPILE_COMMANDS=ON\nfeeds clang-tidy, clangd, IWYU', 'gold')

    e(g, 'conf', 'tgt',  '', '#94a3b8', 'dotted')
    e(g, 'tgt',  'usage')
    e(g, 'usage','inst')
    e(g, 'usage','anti', '', '#dc2626', 'dashed')
    e(g, 'gen',  'cc',   '', '#94a3b8', 'dotted')
    save(g, 'nb-9-cmake')


# 10 ─────────────────────────────────────────────────────────────────
def d10_cross():
    g = base_graph('nb10', 'Cross-compilation — build, host, target, and the sysroot', 'TB')
    n(g, 'terms', 'The three machines (everyone confuses these)\nBUILD  where the compiler runs\nHOST   where the output will run\nTARGET what the output itself compiles for\n        (only meaningful for compilers)\nx86_64 laptop building for aarch64 Linux:\nbuild=x86_64-linux-gnu  host=aarch64-linux-gnu', 'orange')
    n(g, 'triple','GNU target triple\narch-vendor-os-abi\naarch64-linux-gnu\narm-none-eabi (bare metal)', 'navy')
    n(g, 'sys',   'SYSROOT\nA copy of the TARGET filesystem:\n  usr/include  target headers\n  usr/lib      target libraries\n--sysroot=/path so the compiler\nnever picks up host headers', 'purple')
    n(g, 'tc',    'CMake toolchain file\nCMAKE_SYSTEM_NAME Linux\nCMAKE_SYSTEM_PROCESSOR aarch64\nCMAKE_C_COMPILER / CXX\nCMAKE_SYSROOT\nCMAKE_FIND_ROOT_PATH', 'cyan')
    n(g, 'find',  'The trap CMAKE_FIND_ROOT_PATH solves\nWithout the MODE settings, find_package\nhappily finds the HOST library and\nlinks x86_64 objects into an ARM build.\nSet PROGRAM=NEVER, LIBRARY=ONLY,\nINCLUDE=ONLY.', 'red')
    n(g, 'try',   'try_run() cannot work\nYou cannot execute a target binary\non the build machine. Configure tests\nthat run code must be pre-answered\nor guarded.', 'red')
    n(g, 'test',  'Testing cross-built output\nqemu-aarch64 user-mode emulation\nfor unit tests; real hardware for\nanything timing or driver related.', 'green')
    n(g, 'src',   'Where toolchains come from\nDistro cross packages · crosstool-NG\nARM/Linaro releases · Yocto/Buildroot SDK\nzig cc as a self-contained cross compiler', 'teal')

    e(g, 'terms', 'triple'); e(g, 'triple', 'sys'); e(g, 'sys', 'tc')
    e(g, 'tc', 'find', '', '#dc2626'); e(g, 'tc', 'try', '', '#dc2626')
    e(g, 'find', 'test'); e(g, 'sys', 'src', '', '#94a3b8', 'dotted')
    save(g, 'nb-10-cross-compilation')


# 11 ─────────────────────────────────────────────────────────────────
def d11_qt_dev():
    g = base_graph('nb11', 'Qt changes the build graph — moc, uic, rcc run before the compiler', 'TB')
    n(g, 'hdr',  'widget.h\nclass Widget : public QObject {\n  Q_OBJECT\n  signals: void changed();\n};', 'gray')
    n(g, 'ui',   'form.ui\n(Designer XML)', 'gray')
    n(g, 'qrc',  'assets.qrc\n(resource manifest)', 'gray')

    n(g, 'moc',  'moc\nscans for Q_OBJECT,\ngenerates moc_widget.cpp\ncontaining the meta-object,\nsignal emitters and qt_metacall', 'purple')
    n(g, 'uic',  'uic\nform.ui → ui_form.h', 'cyan')
    n(g, 'rcc',  'rcc\nassets.qrc → qrc_assets.cpp\n(binary data as C++ arrays)', 'teal')

    n(g, 'cc',   'C++ compiler\ncompiles your sources AND\nthe generated sources', 'navy')
    n(g, 'link', 'Link against Qt6::Core,\nQt6::Widgets, ...', 'gold')
    n(g, 'app',  'Application', 'orange')

    e(g, 'hdr', 'moc'); e(g, 'ui', 'uic'); e(g, 'qrc', 'rcc')
    e(g, 'moc', 'cc'); e(g, 'uic', 'cc'); e(g, 'rcc', 'cc')
    e(g, 'cc', 'link'); e(g, 'link', 'app')

    n(g, 'fail', 'The signature Qt build failure\n  undefined reference to `vtable for Widget\'\nMeaning: moc never ran on that header.\nCauses: Q_OBJECT added but the header is\nnot in the target sources; AUTOMOC off;\nQ_OBJECT in a .cpp without including\nthe generated moc file.', 'red')
    n(g, 'cmake','CMake does this for you\nset(CMAKE_AUTOMOC ON)\nset(CMAKE_AUTOUIC ON)\nset(CMAKE_AUTORCC ON)\nQt6: find_package(Qt6 COMPONENTS Widgets)\n     qt_add_executable(app ...)\nQt6 moved from qmake to CMake as primary.', 'green')
    n(g, 'lic',  'Licensing is a build constraint\nLGPLv3 requires the user be able to\nrelink against a modified Qt — which\nrules out static linking unless you ship\nobject files or hold a commercial licence.', 'amber')
    e(g, 'moc',  'fail',  '', '#dc2626', 'dashed')
    e(g, 'fail', 'cmake', '', '#16a34a')
    e(g, 'link', 'lic',   '', '#f59e0b', 'dotted')
    save(g, 'nb-11-qt-development')


# 12 ─────────────────────────────────────────────────────────────────
def d12_qt_deploy():
    g = base_graph('nb12', 'Qt deployment — the binary is never enough', 'TB')
    n(g, 'exe', 'Your built app.exe\nRuns on YOUR machine because Qt\nis on your PATH. Ships broken.', 'red')
    n(g, 'need', 'What the user actually needs', 'orange')

    n(g, 'libs', 'Qt libraries\nQt6Core, Qt6Gui, Qt6Widgets ...', 'navy')
    n(g, 'plug', 'PLUGINS — the forgotten half\nplatforms/qwindows.dll (or qcocoa,\n  qxcb on Linux)\nimageformats/ · sqldrivers/ · tls/\nLoaded by path at runtime, so no\nlinker error tells you they are missing.', 'purple')
    n(g, 'dep',  'Third-party deps\nICU, OpenSSL, MSVC redistributable', 'cyan')

    n(g, 'err',  'The single most common Qt\ndeployment failure:\n"This application failed to start\nbecause no Qt platform plugin could\nbe initialized."\nTranslation: platforms/ is missing.', 'red')

    n(g, 'tools','Deploy tools do the walk for you\nwindeployqt app.exe\nmacdeployqt App.app -dmg\nlinuxdeployqt / linuxdeploy + AppImage\nQt6: qt_generate_deploy_app_script()\nqt.conf overrides plugin search paths.', 'green')
    n(g, 'pkg',  'Platform packaging\nWindows  MSI · NSIS · Inno · MSIX\nmacOS    .app → codesign → notarytool\n         → stapler → .dmg\nLinux    AppImage · Flatpak · deb/rpm\nCross    Qt Installer Framework', 'teal')
    n(g, 'stat', 'Or: static Qt build\nOne binary, no plugin directory,\nno deploy tool. But LGPL relinking\nobligation applies — commercial\nlicence or ship the object files.', 'amber')

    e(g, 'exe', 'need')
    e(g, 'need', 'libs'); e(g, 'need', 'plug'); e(g, 'need', 'dep')
    e(g, 'plug', 'err', '', '#dc2626')
    e(g, 'err', 'tools', '', '#16a34a')
    e(g, 'tools', 'pkg')
    e(g, 'pkg', 'stat', '', '#f59e0b', 'dashed')
    save(g, 'nb-12-qt-deployment')


# 13 ─────────────────────────────────────────────────────────────────
def d13_conan_vcpkg():
    g = base_graph('nb13', 'C++ dependency management — Conan and vcpkg')
    with g.subgraph(name='cluster_before') as s:
        s.attr(label='  WITHOUT a package manager  ', style='rounded', color='#ef4444',
               fontcolor='#991b1b', fontname='Helvetica', fontsize='12')
        n(s, 'b1', 'Vendored source in-tree\nyou now maintain a fork', 'red')
        n(s, 'b2', 'git submodules\nversion pinning that nobody\nremembers to update', 'red')
        n(s, 'b3', 'System packages\n"works on my distro"', 'red')
        n(s, 'b4', 'A shared drive of prebuilt .a files\nbuilt by someone who left', 'red')

    n(g, 'mani', 'Declare, do not vendor\nconanfile.py / conanfile.txt\nvcpkg.json manifest', 'orange')
    n(g, 'res',  'Resolve\nversion ranges → concrete graph\nconan.lock / vcpkg baseline\ncommitted for reproducibility', 'navy')

    n(g, 'id',   'Binary identity\nConan: package_id from settings\n(os, arch, compiler, version,\nbuild_type, libcxx) + options\nvcpkg: triplet\nx64-windows / arm64-linux-dynamic\nDifferent compiler = different binary.\nThis is the ABI safety mechanism.', 'purple')
    n(g, 'cache','Binary cache — the real payoff\nHit: download a prebuilt package.\nMiss: build from source, then upload.\nConan remote (Artifactory) /\nvcpkg binary caching (NuGet, files, ...)\nTurns a 40-minute cold build into 2.', 'green')
    n(g, 'gen',  'Integrate with CMake\nConan: CMakeDeps + CMakeToolchain\nvcpkg: -DCMAKE_TOOLCHAIN_FILE=\n       vcpkg.cmake\nBoth end at find_package() +\nimported targets.', 'cyan')

    e(g, 'b1', 'mani', '', '#dc2626', 'dashed')
    e(g, 'mani', 'res'); e(g, 'res', 'id'); e(g, 'id', 'cache'); e(g, 'cache', 'gen')
    save(g, 'nb-13-conan-vcpkg')


# 14 ─────────────────────────────────────────────────────────────────
def d14_build_perf():
    g = base_graph('nb14', 'C++ build performance — measure, then attack the right layer', 'TB')
    n(g, 'meas', 'Measure first\n-ftime-trace (Clang) + ClangBuildAnalyzer\n-ftime-report (GCC)\nninja -t commands / build log timings\nGuessing wastes weeks.', 'orange')

    n(g, 'front', 'FRONTEND time\nheader parsing, template instantiation\nFix: cut the include graph\n  IWYU · forward declarations · pimpl\n  precompiled headers\n  fewer heavy templates in headers', 'navy')
    n(g, 'cache', 'RECOMPILATION\nFix: ccache / sccache\nCache misses come from\n  __DATE__ / __TIME__\n  absolute paths in -g\n  differing -I order\nFixes: -fdebug-prefix-map,\nCCACHE_BASEDIR, hash_dir=false', 'purple')
    n(g, 'dist',  'CPU-BOUND across the fleet\nFix: distribute\n  distcc / icecream\n  Incredibuild\n  Bazel/Buck remote execution\nOnly helps if compile, not link,\nis the bottleneck.', 'cyan')
    n(g, 'link',  'LINK time — the serial tail\nOne link cannot be parallelised.\nFix: mold or lld instead of bfd\n  split into shared libs for dev builds\n  thin LTO not full LTO\n  fewer symbols (-fvisibility=hidden)', 'gold')
    n(g, 'inc',   'INCREMENTAL correctness\nNinja beats Make on graph overhead.\nUnity/jumbo builds speed full builds\nbut destroy incremental ones and\nhide missing includes.', 'teal')

    e(g, 'meas', 'front'); e(g, 'meas', 'cache'); e(g, 'meas', 'dist')
    e(g, 'meas', 'link');  e(g, 'meas', 'inc')

    n(g, 'ram', 'Right-size -j against RAM, not cores.\nLinkers and LTO are memory hogs;\n-j$(nproc) on a 16-core box with 16 GB\nwill OOM-kill the build.', 'red')
    e(g, 'link', 'ram', '', '#dc2626', 'dashed')
    save(g, 'nb-14-build-performance')


# 15 ─────────────────────────────────────────────────────────────────
def d15_gdb():
    g = base_graph('nb15', 'From a crash in CI to an actionable backtrace', 'TB')
    n(g, 'crash', 'Process crashes\nSIGSEGV / SIGABRT', 'red')
    n(g, 'enable','Core dumps must be ENABLED\nulimit -c unlimited\n/proc/sys/kernel/core_pattern\nsystemd-coredump → coredumpctl\nIn containers: the pattern is the\nHOST\'s, and the path must exist\ninside the container.', 'amber')
    n(g, 'core',  'core file\nmemory image + registers.\nContains NO debug info and\nNO the binary itself.', 'purple')
    n(g, 'match', 'Match core to binary\nGNU build-id links them.\nMismatch = garbage backtrace\nor "no matching build-id".\nCI must archive the exact binary.', 'navy')
    n(g, 'sym',   'Symbols\nShip stripped, keep debug separately:\n  objcopy --only-keep-debug app app.dbg\n  strip --strip-debug app\n  objcopy --add-gnu-debuglink=app.dbg app\nOr serve them from debuginfod.', 'cyan')
    n(g, 'gdb',   'gdb ./app core\nbt · thread apply all bt\nframe N · info locals · p expr', 'green')
    n(g, 'fix',   'Actionable stack trace', 'orange')

    e(g, 'crash', 'enable'); e(g, 'enable', 'core'); e(g, 'core', 'match')
    e(g, 'match', 'sym'); e(g, 'sym', 'gdb'); e(g, 'gdb', 'fix')

    n(g, 'opt', '"<optimized out>"\n-O2 kept the value in a register\nor eliminated it entirely.\n-Og gives debuggable optimized code.\nDo not debug -O0 for an -O2 bug:\nthe bug may not exist there.', 'red')
    n(g, 'win', 'Windows equivalent\nminidump (MiniDumpWriteDump or WER)\n+ matching PDB, opened in WinDbg.\nSame rule: archive the PDB with\nthe build or you have nothing.', 'teal')
    e(g, 'gdb', 'opt', '', '#dc2626', 'dotted')
    e(g, 'sym', 'win', '', '#94a3b8', 'dotted')
    save(g, 'nb-15-gdb-coredumps')


# 16 ─────────────────────────────────────────────────────────────────
def d16_sanitizers():
    g = base_graph('nb16', 'Sanitizers — what each finds, and what it costs')
    n(g, 'build', 'Rebuild with instrumentation\n-fsanitize=... -g\n-fno-omit-frame-pointer', 'orange')

    n(g, 'asan', 'AddressSanitizer\nheap/stack/global overflow,\nuse-after-free, use-after-return,\ndouble free (+LeakSanitizer)\nShadow memory + redzones\nCost ~2x CPU, ~3x RAM', 'red')
    n(g, 'ubsan','UndefinedBehaviorSanitizer\nsigned overflow, bad shifts,\nnull deref, misaligned access,\nbad enum/bool values\nCost: small. Combine with ASan.', 'amber')
    n(g, 'tsan', 'ThreadSanitizer\ndata races, lock-order inversion\nHappens-before tracking\nCost ~5-15x CPU, ~5-10x RAM\nCANNOT be combined with ASan', 'purple')
    n(g, 'msan', 'MemorySanitizer\nreads of uninitialized memory\nRequires ALL code instrumented,\nincluding libc++. Hardest to adopt.', 'cyan')
    n(g, 'vg',   'Valgrind memcheck\nNo rebuild needed — runs the\nunmodified binary.\nCost ~20-50x. Finds less than ASan\nbut needs no instrumentation.', 'teal')

    for x in ('asan', 'ubsan', 'tsan', 'msan'):
        e(g, 'build', x)

    n(g, 'ci', 'Where each runs\nEvery PR      ASan + UBSan on unit tests\nNightly       TSan full suite\nOn demand     MSan, Valgrind\nRelease build ships with NONE of them\n\nSuppressions via ASAN_OPTIONS and\na checked-in suppressions file;\nsymbolize with llvm-symbolizer.', 'green')
    e(g, 'asan', 'ci'); e(g, 'tsan', 'ci'); e(g, 'vg', 'ci', '', '#94a3b8', 'dotted')
    save(g, 'nb-16-sanitizers')


# 17 ─────────────────────────────────────────────────────────────────
def d17_testing():
    g = base_graph('nb17', 'C++ test automation — frameworks, CTest, and coverage', 'TB')
    n(g, 'fw', 'Test frameworks\nGoogleTest  TEST/TEST_F/TEST_P,\n  matchers, death tests, GoogleMock\nCatch2 / doctest — lighter,\n  header-only (which costs build time)', 'navy')
    n(g, 'reg', 'Register with CTest\nenable_testing()\nadd_test(NAME x COMMAND x)\ngtest_discover_tests(target)\n  finds each TEST at build time', 'cyan')
    n(g, 'run', 'ctest\n-j N parallel\n--output-on-failure\n--rerun-failed\n--repeat until-fail:50  (flake hunt)\n-L unit  (label selection)\n--timeout / TIMEOUT property\nRESOURCE_LOCK for tests that\n  cannot run concurrently', 'purple')
    n(g, 'rep', 'Report to CI\nJUnit XML (--output-junit)\nso the CI UI shows\nindividual test results', 'teal')
    e(g, 'fw', 'reg'); e(g, 'reg', 'run'); e(g, 'run', 'rep')

    n(g, 'cov',  'Coverage instrumentation\nGCC   --coverage  → .gcno/.gcda → lcov\nClang -fprofile-instr-generate\n      -fcoverage-mapping → llvm-cov\nHTML via genhtml or llvm-cov show', 'green')
    n(g, 'kind', 'Line coverage is the weak metric.\nBRANCH coverage matters more in C++:\nshort-circuit &&, ternaries, and\nexception edges all hide untested paths.\nMC/DC where safety standards demand it.', 'amber')
    n(g, 'gate', 'Gating without gaming\nRatchet: coverage may not DROP.\nMeasure on changed lines, not the\nwhole repo. A hard global number\ninvites assertion-free tests that\nexecute code and check nothing.', 'red')
    n(g, 'tier', 'Tiering\nfast unit tier on every PR (seconds)\nintegration tier on merge (minutes)\nlong/hardware tier nightly', 'gold')

    e(g, 'run', 'cov', '', '#94a3b8', 'dotted')
    e(g, 'cov', 'kind'); e(g, 'kind', 'gate')
    e(g, 'rep', 'tier', '', '#94a3b8', 'dotted')
    save(g, 'nb-17-cpp-testing')


# 18 ─────────────────────────────────────────────────────────────────
def d18_static_analysis():
    # Five stacked layers plus three side notes — vertical, or it renders ~5:1.
    g = base_graph('nb18', 'Static analysis for C/C++ — cheapest signal first', 'TB')
    n(g, 'w', 'LAYER 0 — compiler warnings\nCheapest analysis you already own.\n-Wall -Wextra -Wshadow -Wconversion\n-Wnon-virtual-dtor -Wold-style-cast\n-Werror in CI, NOT in local dev builds', 'green')
    n(g, 'fmt', 'LAYER 1 — clang-format\nStyle is not review material.\nEnforce mechanically.', 'teal')
    n(g, 'tidy', 'LAYER 2 — clang-tidy\nAST-based checks: bugprone-*,\nperformance-*, modernize-*, cert-*\n.clang-tidy config, --fix for\nmechanical changes.\nNEEDS compile_commands.json', 'cyan')
    n(g, 'sa',  'LAYER 3 — path-sensitive analysis\nclang static analyzer / scan-build,\ncppcheck.\nSimulates execution paths, so it\nfinds bugs clang-tidy cannot —\nand produces more false positives.', 'purple')
    n(g, 'comm','LAYER 4 — commercial\nCoverity, PVS-Studio, Klocwork.\nWhole-program, interprocedural,\ncompliance reports (MISRA, AUTOSAR).\nBought for depth and for audits.', 'navy')

    e(g, 'w', 'fmt'); e(g, 'fmt', 'tidy'); e(g, 'tidy', 'sa'); e(g, 'sa', 'comm')

    n(g, 'inc', 'Run incrementally\nChanged files on every PR (fast).\nFull repo nightly (slow, thorough).\nclang-tidy on a 5k-file repo is\nnot a per-PR operation.', 'gold')
    n(g, 'base','The legacy-codebase problem\nTurning analysis on finds 40,000 issues.\nBlocking on that stops all work.\nRATCHET instead: baseline the existing\nset, fail only on NEW findings, burn\nthe baseline down deliberately.', 'red')
    n(g, 'sarif','SARIF output → code scanning\nFindings appear as PR annotations\ninstead of buried in a log.\nTriage workflow for false positives:\nNOLINT with a reason, or a\nsuppression file under review.', 'amber')

    e(g, 'tidy', 'inc',  '', '#94a3b8', 'dotted')
    e(g, 'inc',  'base', '', '#dc2626')
    e(g, 'base', 'sarif')
    save(g, 'nb-18-static-analysis')


# 19 ─────────────────────────────────────────────────────────────────
def d19_python_build():
    g = base_graph('nb19', 'Python as build tooling — testable logic instead of sprawling YAML')
    with g.subgraph(name='cluster_yaml') as s:
        s.attr(label='  YAML-as-logic  ', style='rounded', color='#ef4444',
               fontcolor='#991b1b', fontname='Helvetica', fontsize='12')
        n(s, 'y1', '400-line workflow file\nwith nested if: conditions', 'red')
        n(s, 'y2', 'Copy-pasted across\n6 repositories', 'red')
        n(s, 'y3', 'No unit tests possible.\nOnly way to test a change\nis to push and watch.', 'red')

    n(g, 'py', 'Python build tooling package\nbuild_tools/ with a pyproject.toml,\nconsole_scripts entry points,\npinned + locked, installed on\nevery agent at a known version', 'orange')

    n(g, 'cli',  'CLI surface\nargparse or click\nSubcommands: matrix, version,\naffected, publish', 'navy')
    n(g, 'proc', 'subprocess done right\nrun([...], check=True) — LIST args\nnever shell=True with interpolation\ncapture_output or stream\ntimeout= on everything\npropagate the real exit code', 'purple')
    n(g, 'path', 'pathlib not os.path\nlogging not print\n(CI needs levels and timestamps)', 'cyan')
    n(g, 'test', 'pytest on the build logic\ntmp_path, monkeypatch,\nfake subprocess runners.\nThe matrix generator gets tested\nlike any other code.', 'green')
    n(g, 'type', 'mypy + type hints\nCatches the None that would\notherwise fail 40 minutes into\na release pipeline.', 'teal')

    e(g, 'y3', 'py', '', '#dc2626', 'dashed')
    e(g, 'py', 'cli'); e(g, 'py', 'proc'); e(g, 'py', 'path')
    e(g, 'cli', 'test'); e(g, 'proc', 'test'); e(g, 'test', 'type')

    n(g, 'warn', 'The failure mode to avoid:\nbuild tooling becomes an untested\nmonolith nobody dares change.\nIt is production code. Treat it so.', 'amber')
    e(g, 'type', 'warn', '', '#f59e0b', 'dotted')
    save(g, 'nb-19-python-build-automation')


# 20 ─────────────────────────────────────────────────────────────────
def d20_perl_powershell():
    g = base_graph('nb20', 'Perl and PowerShell — the two you inherit', 'TB')
    with g.subgraph(name='cluster_perl') as s:
        s.attr(label='  PERL — reading what is already there  ', style='rounded',
               color='#6366f1', fontcolor='#3730a3', fontname='Helvetica', fontsize='12')
        n(s, 'pl1', 'Why it is still in mature builds\nregex as a first-class citizen,\npresent on every old Unix,\npredates everything else', 'purple')
        n(s, 'pl2', 'Constructs you will meet\nmy/our · references \\@ \\% $$ref\nhashes of arrays\ns/// and m// with captures\nqw() · here-docs\nsystem() vs backticks vs open pipe\n@ARGV · Getopt::Long · File::Find', 'purple')
        n(s, 'pl3', 'Always: use strict; use warnings;\nTheir absence is why the script\nfails silently on a typo.', 'red')
        n(s, 'pl4', 'Strategy: maintain, do not rewrite\nfor its own sake. Migrate a script\nonly when you are already changing it.', 'green')
        e(s, 'pl1', 'pl2'); e(s, 'pl2', 'pl3'); e(s, 'pl3', 'pl4')

    with g.subgraph(name='cluster_ps') as s:
        s.attr(label='  POWERSHELL — driving Windows agents  ', style='rounded',
               color='#0ea5e9', fontcolor='#075985', fontname='Helvetica', fontsize='12')
        n(s, 'ps1', 'The mental shift\nThe pipeline carries OBJECTS,\nnot text. No awk/cut needed —\nyou select properties.', 'sky')
        n(s, 'ps2', 'Verb-Noun cmdlets\nGet-ChildItem · Where-Object\nForEach-Object · Select-Object', 'sky')
        n(s, 'ps3', 'The silent-failure trap\n$ErrorActionPreference defaults to\nContinue — a failing step does NOT\nstop the script.\nSet it to "Stop" and use try/catch.', 'red')
        n(s, 'ps4', 'Native tools do not throw.\nAfter calling cl.exe or signtool,\ncheck $LASTEXITCODE yourself.', 'red')
        n(s, 'ps5', 'CI realities\npwsh 7 cross-platform vs\nWindows PowerShell 5.1\n-ExecutionPolicy Bypass\nPester for tests\nDrives vcvars, MSBuild, signtool', 'teal')
        e(s, 'ps1', 'ps2'); e(s, 'ps2', 'ps3'); e(s, 'ps3', 'ps4'); e(s, 'ps4', 'ps5')

    save(g, 'nb-20-perl-powershell')


# 21 ─────────────────────────────────────────────────────────────────
def d21_bitbucket():
    g = base_graph('nb21', 'Bitbucket Pipelines — execution model and structure', 'TB')
    n(g, 'yml', 'bitbucket-pipelines.yml\nat the repository root', 'orange')
    n(g, 'trig', 'Triggers\ndefault: · branches: · tags:\npull-requests: · custom: (manual)', 'navy')
    n(g, 'step', 'step\nEACH STEP RUNS IN A FRESH\nDOCKER CONTAINER.\nNothing survives between steps\nexcept artifacts and caches.', 'purple')
    n(g, 'par',  'parallel:\nsteps run concurrently\nstages: group + gate them', 'cyan')
    n(g, 'run',  'Runner\nAtlassian cloud runner\nOR self-hosted (Linux/Win/macOS)\n— required for MSVC, Qt, GPUs,\nor licensed toolchains', 'teal')
    e(g, 'yml', 'trig'); e(g, 'trig', 'step'); e(g, 'step', 'par'); e(g, 'par', 'run')

    n(g, 'ac', 'caches vs artifacts\ncaches:    speed only, may vanish,\n           keyed by a definition\nartifacts: correctness, passed to\n           LATER steps in the pipeline\nConfusing them is the usual\n"works locally, empty in CI" bug.', 'amber')
    n(g, 'svc', 'services:\nsidecar containers (docker, postgres)\nEach step has a MEMORY BUDGET\n(default 4096 MB, 8192 with 2x).\nservices share it — a big C++ link\nplus a database will OOM.', 'red')
    n(g, 'var', 'Variables and secrets\nworkspace / repository / deployment\nsecured variables are masked and\nNOT exposed to forked-PR builds.\nOIDC for keyless cloud auth.', 'green')
    n(g, 'reuse','Reuse\nYAML anchors (&name / *name)\nPipes — packaged reusable steps,\nthe rough analogue of an Action.\nWeaker ecosystem than GH Actions.', 'gold')
    n(g, 'cost', 'Build minutes are metered.\nLong C++ builds make self-hosted\nrunners cheaper fast.', 'sky')

    e(g, 'step', 'ac',  '', '#f59e0b', 'dotted')
    e(g, 'step', 'svc', '', '#dc2626', 'dotted')
    e(g, 'run',  'var', '', '#94a3b8', 'dotted')
    e(g, 'run',  'reuse', '', '#94a3b8', 'dotted')
    e(g, 'run',  'cost', '', '#94a3b8', 'dotted')
    save(g, 'nb-21-bitbucket-pipelines')


# 22 ─────────────────────────────────────────────────────────────────
def d22_signing():
    g = base_graph('nb22', 'Signing native binaries — three platforms, one key-custody problem')
    n(g, 'bin', 'Built binary', 'orange')

    with g.subgraph(name='cluster_win') as s:
        s.attr(label='  WINDOWS  ', style='rounded', color='#3b82f6',
               fontcolor='#1e40af', fontname='Helvetica', fontsize='12')
        n(s, 'w1', 'Authenticode via signtool\nEV or OV certificate', 'navy')
        n(s, 'w2', 'Since 2023 the private key MUST\nlive on an HSM or a cloud signing\nservice (Azure Trusted Signing).\nNo more .pfx in a variable.', 'red')
        n(s, 'w3', 'TIMESTAMP the signature.\nWithout /tr, every binary you\never shipped becomes untrusted\nthe day the cert expires.', 'red')
        n(s, 'w4', 'SmartScreen reputation accrues\nto the certificate. Rotating\nidentity resets user trust.', 'amber')
        e(s, 'w1', 'w2'); e(s, 'w2', 'w3'); e(s, 'w3', 'w4')

    with g.subgraph(name='cluster_mac') as s:
        s.attr(label='  MACOS  ', style='rounded', color='#6366f1',
               fontcolor='#3730a3', fontname='Helvetica', fontsize='12')
        n(s, 'm1', 'codesign with a Developer ID,\nhardened runtime + entitlements', 'purple')
        n(s, 'm2', 'notarytool submit --wait\nApple scans the binary', 'purple')
        n(s, 'm3', 'stapler staple\nso Gatekeeper works OFFLINE.\nSkip it and first launch fails\nfor users with no network.', 'red')
        e(s, 'm1', 'm2'); e(s, 'm2', 'm3')

    with g.subgraph(name='cluster_lin') as s:
        s.attr(label='  LINUX  ', style='rounded', color='#22c55e',
               fontcolor='#166534', fontname='Helvetica', fontsize='12')
        n(s, 'l1', 'GPG-signed packages and repos\n(rpm --addsign, debsign)', 'green')
        n(s, 'l2', 'No OS-enforced binary signature\nfor ordinary executables.\nTrust rides on the package repo.', 'teal')
        e(s, 'l1', 'l2')

    e(g, 'bin', 'w1'); e(g, 'bin', 'm1'); e(g, 'bin', 'l1')

    n(g, 'key', 'The shared problem: KEY CUSTODY\nNever put a signing key in CI env vars.\nA dedicated signing service:\n  CI requests a signature over a digest\n  HSM/KMS holds the key (PKCS#11)\n  every request is authenticated + logged\n  short-lived credentials, no key exfil', 'gold')
    n(g, 'repro','Signing is only meaningful if the\nartifact is reproducible and its\nprovenance is recorded — SBOM for\nnative deps, build provenance,\nversion metadata in the binary.', 'cyan')
    e(g, 'w2', 'key', '', '#f59e0b')
    e(g, 'm1', 'key', '', '#f59e0b')
    e(g, 'key', 'repro')
    save(g, 'nb-22-native-signing')


if __name__ == '__main__':
    d1_compilation_model(); d2_linking(); d3_gcc_toolchain(); d4_gcc_upgrades()
    d5_stdlib_abi(); d6_msvc(); d7_win_vs_posix(); d8_make(); d9_cmake()
    d10_cross(); d11_qt_dev(); d12_qt_deploy(); d13_conan_vcpkg()
    d14_build_perf(); d15_gdb(); d16_sanitizers(); d17_testing()
    d18_static_analysis(); d19_python_build(); d20_perl_powershell()
    d21_bitbucket(); d22_signing()
    print('\nAll 22 native-build diagrams generated.')
