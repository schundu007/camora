// AI Systems Performance Engineering — interview prep grounded in
// "AI Systems Performance" by Chris Fregly (O'Reilly, Nov 2025, 1062 pp).
// Covers GPU hardware, CUDA kernels, distributed training, LLM inference,
// PyTorch optimization, quantization, MoE, and disaggregated serving.

export const aiSystemsPerfCategories = [
  { id: 'ai-perf-hardware',   name: 'GPU Hardware & Architecture',    icon: 'cpu',      color: '#8b5cf6' },
  { id: 'ai-perf-cuda',       name: 'CUDA Programming & Kernels',     icon: 'zap',      color: '#6366f1' },
  { id: 'ai-perf-training',   name: 'Distributed Training',           icon: 'network',  color: '#10b981' },
  { id: 'ai-perf-inference',  name: 'LLM Inference Optimization',     icon: 'layers',   color: '#0ea5e9' },
  { id: 'ai-perf-frameworks', name: 'PyTorch & Framework Tuning',     icon: 'settings', color: '#f59e0b' },
];

export const aiSystemsPerfTopicCategoryMap = {
  'rocm-amd-gpu-stack': 'ai-perf-hardware',
  'gpu-architecture-overview':       'ai-perf-hardware',
  'cuda-memory-hierarchy':           'ai-perf-cuda',
  'cuda-kernel-profiling':           'ai-perf-cuda',
  'distributed-training-nccl':       'ai-perf-training',
  'llm-kv-cache-batching':           'ai-perf-inference',
  'disaggregated-prefill-decode':    'ai-perf-inference',
  'speculative-decoding':            'ai-perf-inference',
  'quantization-model-compression':  'ai-perf-inference',
  'moe-inference-optimization':      'ai-perf-inference',
  'pytorch-compile-fsdp':            'ai-perf-frameworks',
};

export const aiSystemsPerfTopics = [
  {
    id: "rocm-amd-gpu-stack",
    title: "ROCm & the AMD GPU Stack",
    icon: "cpu",
    color: "#ef4444",
    questions: 6,
    description: "A bottom-to-top tour of the AMD ROCm stack — firmware, amdgpu, amdkfd, ROCr, HIP, and math/comm libraries — and how firmware, driver, and ROCm versions must cohere on a validated node.",
    introduction: "## Why This Topic\n\nEvery GPU stack you have seen on this platform so far has been NVIDIA plus CUDA. The AMD counterpart is ROCm (Radeon Open Compute), and it matters because AMD Instinct accelerators like the `MI300X` now run large training and inference fleets. If you are validating an AMD GPU CI/CD pipeline, your job is not one component — it is proving that GPU firmware, the `amdgpu` kernel driver, and the userspace ROCm runtime all agree with each other on the same node.\n\n## The Stack Is A Recipe\n\nThe ROCm stack layers cleanly from silicon up to the framework. Each layer only talks to the one directly below it, so a break at any layer looks like the whole GPU disappearing:\n\n```bash\nPyTorch / TensorFlow (ROCm build)\n  rocBLAS / rocFFT / MIOpen / RCCL      # math + collective libs\n  HIP runtime (libamdhip64)             # CUDA-portable API\n  ROCr / HSA runtime (libhsa-runtime64) # queues, signals, memory\n  amdkfd (/dev/kfd)  +  amdgpu (/dev/dri) # kernel: compute + DRM\n  GPU firmware (microcode, loaded by amdgpu at probe)\n  AMD Instinct silicon (CDNA, e.g. MI300)\n```\n\n## The Core Validation Problem\n\nThe three moving parts — firmware version, `amdgpu`/`amdkfd` driver version, and ROCm userspace version — are released together and are only supported in specific combinations. A node can look healthy at the OS level yet expose zero GPUs to `HIP` because the firmware the driver loaded is older than the runtime expects, or because `dkms` failed to rebuild `amdgpu` after a kernel bump. Learning where each layer reports its version, and how a mismatch surfaces (`hipErrorNoDevice`, empty `/sys/class/kfd` topology, GPU missing from `rocminfo`), is the entire discipline of this role.",
    quickFire: [
      { q: "What is ROCm?", a: "AMD open compute software stack for GPU compute — the kernel driver, `ROCr` runtime, `HIP`, and math/comm libraries that together let code run on AMD Instinct GPUs, the AMD analog of CUDA." },
      { q: "What does amdgpu do?", a: "It is the upstream Linux kernel DRM driver for AMD GPUs. It probes the device, loads GPU firmware microcode, and exposes `/dev/dri` nodes for both graphics and compute." },
      { q: "What is amdkfd?", a: "The Kernel Fusion Driver component that exposes compute to userspace via `/dev/kfd`. It builds the HSA topology under `/sys/class/kfd` that `ROCr` reads to enumerate GPUs." },
      { q: "What is ROCr / the HSA runtime?", a: "The ROCm runtime (`libhsa-runtime64`) implementing the HSA model — queues, signals, and memory management. It sits between `HIP` and `amdkfd`." },
      { q: "What is HIP?", a: "Heterogeneous-compute Interface for Portability — a C++ API that is source-portable with CUDA. The same `HIP` source compiles for AMD (`amdhip64`) or NVIDIA backends." },
      { q: "What does hipify do?", a: "It rewrites CUDA source into `HIP` source by mapping `cuda*` calls to `hip*` equivalents, via `hipify-perl` (text substitution) or `hipify-clang` (AST-based)." },
      { q: "What is rocminfo?", a: "The HSA agent enumerator. It lists every CPU and GPU agent the runtime sees, including each GPU marketing name and `gfx` target (for example `gfx942` on MI300)." },
      { q: "What is RCCL?", a: "The ROCm Communication Collectives Library — AMD equivalent of NCCL, providing `AllReduce`, `AllGather`, and `Broadcast` over Infinity Fabric or PCIe for multi-GPU training." },
      { q: "What is CDNA and the Instinct MI series?", a: "CDNA is AMD compute-focused GPU architecture; Instinct MI-series (for example `MI300X`, `MI250`) are the datacenter accelerators built on it, targeted by `gfx9xx` ISA codes." },
      { q: "What does rocm-smi report?", a: "Per-GPU telemetry and control — temperature, power, clocks, VRAM use, utilization, and the ROCm/driver version — the AMD counterpart to `nvidia-smi`." },
    ],
    keyQuestions: [
      { question: "Walk me through the ROCm stack layer by layer, and tell me exactly where a version mismatch breaks it.", answer: "## The Layers, Bottom To Top\n\nThink of it as a strict chain where each layer only trusts the one below it.\n\n```bash\n# 1. Firmware  - microcode blobs the driver pushes to the GPU at probe\n# 2. amdgpu     - kernel DRM driver -> /dev/dri/renderD*\n# 3. amdkfd     - compute driver    -> /dev/kfd, /sys/class/kfd topology\n# 4. ROCr/HSA   - libhsa-runtime64  - queues, signals, memory\n# 5. HIP        - libamdhip64       - CUDA-portable device API\n# 6. libs       - rocBLAS rocFFT MIOpen RCCL\n# 7. framework  - PyTorch/TF ROCm build\n```\n\n## Where Each Layer Publishes Its Version\n\n```bash\n# firmware version the driver actually loaded\ncat /sys/class/drm/card0/device/fw_version 2>/dev/null\ndmesg | grep -i 'amdgpu.*fw'\n\n# kernel driver (amdgpu / amdkfd) version via dkms\ndkms status\n# amdgpu, 6.8.5, 6.5.0-1023-generic, x86_64: installed\n\n# userspace ROCm version\ncat /opt/rocm/.info/version\n# 6.2.0-66\n```\n\n## Where A Mismatch Breaks The Chain\n\nThe failure is almost always at a layer boundary:\n\n- Firmware older than the driver expects: `amdgpu` probe fails or the GPU comes up but `amdkfd` never builds a compute node, so `/sys/class/kfd/kfd/topology/nodes` has no GPU entry.\n- `amdgpu` not rebuilt after a kernel upgrade (`dkms` broken): `/dev/kfd` is absent and `rocminfo` shows only the CPU agent.\n- ROCm userspace newer than the installed `amdgpu` DKMS: `ROCr` loads but `hipGetDeviceCount` returns 0 and you get `hipErrorNoDevice`.\n\n## The Mental Model\n\nA GPU that is physically present (`lspci` shows it) can still be invisible to `HIP`. Enumeration only succeeds when firmware, `amdgpu`/`amdkfd`, and `ROCr` are all from a mutually supported combination. That coherence — not any single component being new — is what you validate." },
      { question: "You are handed a fresh MI300 node. How do you validate that firmware, driver, and ROCm are coherent before you let CI run on it?", answer: "## Step 1: Confirm The Hardware Is Even There\n\n```bash\nlspci -d 1002: | grep -i 'Instinct\\|Display\\|Processing'\n# c1:00.0 Processing accelerators: Advanced Micro Devices AMD Instinct MI300X\n```\n\nIf `lspci` is empty, stop — this is a PCIe/BIOS problem, not a software one.\n\n## Step 2: Confirm The Kernel Driver Is Built And Loaded\n\n```bash\nlsmod | grep -E 'amdgpu|amdkfd'\ndkms status\n# amdgpu, 6.8.5, 6.5.0-1023-generic, x86_64: installed\n\nls -l /dev/kfd /dev/dri/renderD*\n# crw-rw---- 1 root render 236, 0 /dev/kfd\n```\n\nMissing `/dev/kfd` means `amdkfd` did not initialize — check `dmesg | grep -i amdgpu` for firmware load errors.\n\n## Step 3: Confirm Firmware And Topology Agree\n\n```bash\nls /sys/class/kfd/kfd/topology/nodes/\n# 0  1  2 ...   (node 0 is CPU; GPU nodes must be present)\ndmesg | grep -i 'amdgpu.*fw_version\\|failed to load'\n```\n\nAn empty topology with a healthy driver is the classic firmware-vs-driver mismatch signature.\n\n## Step 4: Confirm The Runtime Enumerates Every GPU\n\n```bash\nrocminfo | grep -E 'Name:|Marketing|gfx'\n# Name: gfx942\n# Marketing Name: AMD Instinct MI300X\n\nrocm-smi --showdriverversion --showproductname\n# Driver version: 6.8.5\n# Card series: AMD Instinct MI300X\n```\n\n## Step 5: Confirm HIP Sees The Same Count\n\n```bash\n/opt/rocm/bin/hipconfig --version\ncat > /tmp/count.cpp <<'EOF'\n#include <hip/hip_runtime.h>\n#include <cstdio>\nint main(){int n=0; hipGetDeviceCount(&n); printf(\"HIP devices: %d\\n\", n); return 0;}\nEOF\nhipcc /tmp/count.cpp -o /tmp/count && /tmp/count\n# HIP devices: 8\n```\n\n## The Gate\n\nThe node passes only when `lspci`, `rocminfo`, `rocm-smi`, and the `HIP` device count all report the same number of GPUs, and `/opt/rocm/.info/version` plus `dkms status` plus the loaded firmware are a combination listed in AMD supported matrix. Any disagreement fails the node before CI touches it." },
      { question: "Port this CUDA kernel to HIP. Show the mechanical steps and what actually changes.", answer: "## Start With Automated Translation\n\nMost of the port is mechanical, so let the tool do the first pass.\n\n```bash\n# preview the diff without writing\nhipify-perl --examine saxpy.cu\n# [HIPIFY] info: converted 6 CUDA->HIP refs\n\n# apply in place\nhipify-perl saxpy.cu > saxpy.cpp\n```\n\n## What The Mapping Looks Like\n\nThe API is intentionally one-to-one, so the translation reads as a prefix swap.\n\n```bash\n# CUDA                     ->  HIP\n# cudaMalloc               ->  hipMalloc\n# cudaMemcpy               ->  hipMemcpy\n# cudaMemcpyHostToDevice   ->  hipMemcpyHostToDevice\n# __global__ kernel<<<g,b>>> -> hipLaunchKernelGGL(kernel, g, b, 0, 0, ...)\n# cudaDeviceSynchronize    ->  hipDeviceSynchronize\n# #include <cuda_runtime.h>->  #include <hip/hip_runtime.h>\n```\n\nThe kernel body itself — `blockIdx`, `threadIdx`, `blockDim` — is unchanged because `HIP` keeps the same built-ins.\n\n## Compile For The AMD Target\n\n```bash\nhipcc saxpy.cpp -o saxpy --offload-arch=gfx942\n./saxpy\n# result verified: max error 0.000000\n```\n\n## What Needs Human Review\n\nAutomation gets you most of the way, but check these by hand:\n\n- Warp size: CUDA assumes 32; AMD CDNA wavefronts are 64. Any code using `warpSize`, `__shfl`, or a hardcoded 32 must be revisited.\n- Library calls: `cuBLAS` maps to `rocBLAS` (or `hipBLAS` for a portable shim); `cuDNN` maps to `MIOpen`. These are separate link changes, not text swaps.\n- Inline PTX assembly: has no AMD equivalent and must be rewritten in `HIP` intrinsics.\n\n## The Portable Outcome\n\n```bash\n# same source now builds for both backends\nhipcc saxpy.cpp -o saxpy                 # AMD via amdhip64\nHIP_PLATFORM=nvidia hipcc saxpy.cpp      # NVIDIA via CUDA backend\n```\n\nThat source portability is the entire point of `HIP`: one tree, two vendors, with only warp-width and library bindings needing engineer attention." },
      { question: "CI reports no ROCm GPU detected on a node that worked yesterday. Debug it.", answer: "## Reproduce And Read The Error\n\n```bash\nrocminfo | grep -c gfx\n# 0\npython -c 'import torch; print(torch.cuda.is_available())'\n# False\n# RuntimeError: HIP error: hipErrorNoDevice\n```\n\nZero `gfx` agents plus `hipErrorNoDevice` means enumeration failed below `HIP` — work downward through the layers.\n\n## Check The Kernel Layer First\n\nSomething changed since yesterday; a kernel upgrade is the usual culprit.\n\n```bash\nuname -r\n# 6.5.0-1025-generic   <- note: newer than yesterday\ndkms status\n# amdgpu, 6.8.5: added        <- NOT 'installed' -> build never completed\n\nls /dev/kfd\n# ls: cannot access '/dev/kfd': No such file or directory\n```\n\nThat is the smoking gun: the kernel was updated, `amdgpu` DKMS did not rebuild against the new kernel, so `amdkfd` never created `/dev/kfd`.\n\n## Confirm Via The Topology And Logs\n\n```bash\nls /sys/class/kfd/kfd/topology/nodes/ 2>/dev/null\n# (empty or missing)\ndmesg | grep -i amdgpu | tail\n# amdgpu: module verification failed\n# amdgpu: Fatal error during GPU init\n```\n\n## Fix: Rebuild The Driver For The Running Kernel\n\n```bash\nsudo dkms autoinstall -k $(uname -r)\nsudo modprobe amdgpu\ndkms status\n# amdgpu, 6.8.5, 6.5.0-1025-generic, x86_64: installed\nls /dev/kfd && rocminfo | grep -c gfx\n# 8\n```\n\n## If The Driver Was Fine — Check Permissions And Firmware\n\n```bash\n# CI user must be in render + video groups\nid ci-runner | grep -o 'render\\|video'\nsudo usermod -aG render,video ci-runner\n\n# firmware missing after an image change\ndmesg | grep -i 'failed to load.*amdgpu'\nls /lib/firmware/amdgpu/ | grep -i mi300\n```\n\n## The Root-Cause Discipline\n\nAlways debug bottom-up: firmware loaded? `amdgpu`/`amdkfd` built for the running kernel? `/dev/kfd` present with right group? topology populated? Only then blame `HIP` or the framework. In CI, pin the kernel or gate the pipeline on a `dkms status` check so a silent kernel bump never strands the driver again." },
      { question: "You own the compatibility matrix for a ROCm release. How do you reason about which firmware, driver, and ROCm versions are allowed together?", answer: "## The Three Independent Axes\n\nA supported node is a point in a three-dimensional space, and not every point is valid.\n\n```bash\n# axis 1: GPU firmware (per-ASIC microcode)\ncat /sys/class/drm/card0/device/fw_version\n# axis 2: amdgpu/amdkfd kernel driver (DKMS or inbox)\ndkms status | grep amdgpu\n# axis 3: ROCm userspace\ncat /opt/rocm/.info/version\n```\n\nAMD publishes a support matrix that lists which ROCm userspace versions are validated against which `amdgpu` driver versions and which kernels/distros. Firmware ships bundled with the driver package, so in practice pinning the driver pins a compatible firmware.\n\n## The Compatibility Rules That Actually Bite\n\n- ROCm userspace generally supports the driver from the same release and one or two adjacent releases, not arbitrary skew. A very new ROCm on an old `amdgpu` gives `hipErrorNoDevice`.\n- The `gfx` target must be in the ROCm build. A `MI300X` is `gfx942`; if the `rocBLAS` package was built without `gfx942` kernels you get missing-kernel errors even though the GPU enumerates.\n- Kernel + distro are part of the matrix. `amdgpu` DKMS only builds cleanly against supported kernel ranges.\n\n## How I Encode It In CI\n\n```bash\n# assert the running node matches the pinned combination\nexpected_rocm=6.2.0\nexpected_drv=6.8.5\ngot_rocm=$(cat /opt/rocm/.info/version | cut -d- -f1)\ngot_drv=$(dkms status | grep -oP 'amdgpu, \\K[0-9.]+' | head -1)\n[ \"$got_rocm\" = \"$expected_rocm\" ] && [ \"$got_drv\" = \"$expected_drv\" ] \\\n  || { echo 'MATRIX MISMATCH'; exit 1; }\n\n# assert the target ISA is actually built into the libs\nrocminfo | grep -oP 'gfx[0-9a-f]+' | sort -u\n# gfx942\nroc-obj-ls /opt/rocm/lib/librocblas.so | grep gfx942\n```\n\n## Validating A New Release\n\n```bash\n# matrix job: cross every supported (driver x rocm) cell on real silicon\n# for each cell: install, then run the enumerate + smoke gate\nrocminfo | grep -c gfx && rocm-smi --showproductname\nhipcc smoke.cpp -o smoke --offload-arch=gfx942 && ./smoke\n```\n\n## The Principle\n\nDo not certify a ROCm version in isolation — certify a tuple of (firmware, `amdgpu`/`amdkfd`, ROCm, kernel, distro, `gfx` target). The matrix is the product you actually ship, and every CI node must be pinned to a cell that appears in it. Anything outside a validated cell is unsupported even if it happens to boot." },
      { question: "A multi-GPU training job on 8x MI300X hangs during AllReduce. How do you reason about RCCL and the interconnect?", answer: "## What RCCL Sits On\n\n`RCCL` is the collectives library, but it runs over a physical fabric. On `MI300X` that is Infinity Fabric between GPUs, falling back to PCIe. A hang is usually the transport, not the math.\n\n```bash\nrocm-smi --showtopo\n# GPU0  GPU1  ...   link type\n# XGMI (Infinity Fabric) between peers, or PCIE if not linked\nrocm-smi --shownodesbw\n# shows measured inter-GPU bandwidth per link\n```\n\n## Turn On RCCL Diagnostics First\n\n```bash\nexport RCCL_DEBUG=INFO\nexport RCCL_DEBUG_SUBSYS=INIT,COLL,P2P\npython train.py\n# RCCL INFO Channel 00 : 0[0] -> 1[1] via P2P/IPC\n# RCCL INFO ... waiting on channel  <- where it stalls tells you the pair\n```\n\nThe last successful ring/channel line points at the exact GPU pair that failed to connect.\n\n## Common Causes Of The Hang\n\n- Peer access blocked: if XGMI is not enabled between two GPUs, `RCCL` silently falls back or stalls. Confirm with `rocm-smi --showtopo`; a `PCIE` link where you expected `XGMI` is a red flag.\n- IOMMU / ACS: PCIe Access Control Services or IOMMU in the wrong mode blocks GPU-to-GPU DMA. Check `dmesg | grep -i iommu` and the platform docs for pass-through mode.\n- Mismatched `RCCL` across ranks: every process must load the same `RCCL` and ROCm version; a heterogeneous fleet deadlocks on init.\n- A single hung GPU: one GPU stuck at 100 percent or in an error state stalls the whole collective because AllReduce is a barrier.\n\n## Isolate With A Standalone Test\n\n```bash\n# rccl-tests: does the collective work outside the framework?\n./build/all_reduce_perf -b 8 -e 256M -f 2 -g 8\n# 8 GPUs, ramps sizes; if THIS hangs, the fault is fabric/RCCL, not PyTorch\n```\n\n## Force A Working Transport To Confirm\n\n```bash\n# temporarily disable P2P to prove it is the interconnect\nexport RCCL_P2P_DISABLE=1\n./build/all_reduce_perf -b 8 -e 256M -f 2 -g 8\n# if it now completes, the problem is XGMI/PCIe peer access, not RCCL logic\n```\n\n## The Reasoning Chain\n\nSeparate the layers: is it the collective library, the transport, or one bad GPU? `rccl-tests` isolates framework from fabric; `RCCL_DEBUG=INFO` names the failing pair; `rocm-smi --showtopo` tells you whether that pair even has an XGMI path; and `RCCL_P2P_DISABLE=1` confirms the interconnect as root cause. Fix the fabric or the outlier GPU — do not tune the training script for what is a hardware-topology problem." },
    ],
  },

  // ─── 1. GPU Architecture Overview ────────────────────────────────────────
  {
    id: 'gpu-architecture-overview',
    title: 'GPU Architecture & AI Hardware',
    icon: 'cpu',
    color: '#8b5cf6',
    questions: 12,
    description: 'NVIDIA GPU architecture from streaming multiprocessors through tensor cores, HBM memory, NVLink, and Blackwell-class superchips. Hardware-software codesign and "mechanical sympathy" for AI workloads.',
    introduction: `Understanding GPU architecture at the hardware level is the prerequisite for every optimization decision in AI systems. Unlike CPUs, which are designed for low-latency serial execution, GPUs are throughput processors: they sacrifice single-thread performance to execute thousands of threads concurrently, hiding memory latency through massive parallelism. This architectural difference shapes every technique in AI performance engineering.

## Streaming Multiprocessors and the Execution Hierarchy

A GPU is organized into Streaming Multiprocessors (SMs). Each SM contains multiple CUDA cores (FP32 units), tensor cores (for mixed-precision matrix math), load/store units, and a shared memory / L1 cache block. The execution hierarchy maps directly onto the hardware: a CUDA grid contains thread blocks, each thread block executes on exactly one SM, and threads within a block execute in groups of 32 called warps. The warp is the hardware unit of execution -- all 32 threads in a warp execute the same instruction in lockstep (SIMT). Warp divergence, when threads in the same warp take different branches, serializes those paths and reduces effective throughput.

## Tensor Cores

Tensor cores are the most important hardware unit for AI workloads. They perform fused multiply-add (FMA) on matrix tiles: D = A * B + C. On Hopper H100, a tensor core performs a 16x16 matrix FMA in BF16 in a single clock cycle. This is the engine behind GEMM (general matrix multiply) and attention. The key constraint is that tensor cores operate on specific tile sizes and data types -- the programmer (or the compiler) must tile the problem to match these hardware tiles. Operations that cannot be expressed as tensor-core GEMM fall back to CUDA cores and run dramatically slower.

> [!WARNING] Operations that miss tensor cores (wrong data type, misaligned tile sizes) run at CUDA core throughput -- roughly 30x slower than BF16 tensor core peak on H100. Always verify tensor core utilization in Nsight Compute before declaring a GEMM optimized.

## Memory Hierarchy

GPU memory has five levels, each with different capacity and bandwidth tradeoffs. Registers are the fastest and have zero latency but are per-thread and extremely limited (typically 255 registers per thread, shared across the SM). Shared memory (L1 cache, 32-256 KB per SM on Hopper) is shared across a thread block, has ~10-cycle latency, and is the key resource for tiling algorithms. L2 cache (50 MB on H100) is shared across all SMs. HBM (High Bandwidth Memory, 80 GB on H100 SXM5) provides 3.35 TB/s peak bandwidth but with ~500 ns latency. This bandwidth is the bottleneck for memory-bound kernels like attention decode.

> [!TIP] The memory latency hierarchy spans 4 orders of magnitude: registers (1 cycle) → shared memory (10-20 cycles) → L2 (100-200 cycles) → HBM (500-800 cycles). Every kernel optimization is fundamentally about moving data closer to registers before operating on it.

## NVIDIA Blackwell Architecture

The NVIDIA Blackwell GPU (2024-2025) introduces several advances critical for large model inference. The GB200 NVL72 system connects 36 Grace CPUs and 72 Blackwell GPUs via NVLink 5.0 with 1.8 TB/s GPU-to-GPU bandwidth and 900 GB/s CPU-to-GPU bandwidth. Each Blackwell GPU has 192 GB HBM3e with 8 TB/s bandwidth, 4th-generation tensor cores supporting FP4 operations, and a second-generation Transformer Engine. The key innovation for inference is that KV cache can be stored on different chips and streamed over NVLink at full bandwidth, enabling KV cache disaggregation across a 72-GPU island without going through the CPU.

## NVLink and Multi-GPU Topology

NVLink is NVIDIA proprietary high-speed GPU-to-GPU interconnect. NVLink 4.0 (Hopper) provides 900 GB/s bidirectional bandwidth between paired GPUs, compared to ~64 GB/s for PCIe 4.0. NVSwitch creates an all-to-all NVLink fabric within a node, eliminating the bandwidth reduction in tree-based topologies when GPUs communicate. The bandwidth gap between intra-node NVLink and inter-node InfiniBand is the root cause of tensor parallelism being preferred within a node and pipeline/data parallelism across nodes.

## Goodput vs Throughput

A key concept from AI systems performance engineering is goodput -- the fraction of theoretical hardware throughput that is doing useful work. A GPU might have 3.35 TB/s HBM bandwidth and 1979 TFLOPS BF16 tensor performance. Goodput measures what fraction of these peaks your workload actually achieves. The roofline model plots achieved FLOPS vs. arithmetic intensity (FLOPS per byte of memory traffic) against the hardware roofline to diagnose whether a kernel is compute-bound or memory-bound. Maximizing goodput is the central objective of all kernel optimization work.

## MIG and MPS

Multi-Instance GPU (MIG) partitions a GPU into up to 7 isolated instances, each with dedicated SM slices, L2 cache slices, and HBM slices. MIG provides hardware isolation suitable for multi-tenant serving where QoS guarantees are required. Multi-Process Service (MPS) allows multiple CUDA processes to share the GPU without MIG spatial partitioning, enabling higher occupancy when batches are small. The choice depends on isolation requirement: MIG for strict SLA isolation, MPS for maximizing utilization in trusted workloads.`,

    quickFire: [
      { q: 'What is a warp?', a: 'A group of 32 CUDA threads that execute the same instruction in lockstep (SIMT). It is the hardware scheduling unit on an SM.' },
      { q: 'What is warp divergence?', a: 'When threads in a warp take different code paths (if/else branches), the GPU serializes the paths, reducing effective parallelism to 1/N of the warp.' },
      { q: 'What are tensor cores and what operation do they accelerate?', a: 'Hardware units that perform D = A*B + C (fused matrix multiply-accumulate) on small tiles (e.g. 16x16 BF16) in a single clock. They are the engine for GEMM and attention.' },
      { q: 'What is the memory bandwidth of H100 SXM5?', a: '3.35 TB/s HBM3 bandwidth. This is the bottleneck for memory-bound kernels like softmax and elementwise ops.' },
      { q: 'Why is NVLink bandwidth critical for tensor parallelism?', a: 'Tensor parallelism requires an AllReduce per linear layer per forward/backward pass. NVLink provides 900 GB/s vs ~64 GB/s for PCIe, making TP viable within a node.' },
      { q: 'What is the difference between MIG and MPS?', a: 'MIG partitions the GPU into hardware-isolated instances with dedicated resources. MPS shares the GPU among processes without isolation. MIG for multi-tenant QoS; MPS for utilization.' },
      { q: 'What is arithmetic intensity?', a: 'FLOP count divided by bytes of memory traffic. A kernel with high arithmetic intensity is compute-bound; low intensity means memory-bound.' },
      { q: 'What is GPU persistence mode?', a: 'Keeps the GPU driver loaded continuously, eliminating the ~2-second initialization cost on the first CUDA call. Required in production serving to meet latency SLAs.' },
      { q: 'What is NUMA awareness in GPU systems?', a: 'On multi-socket servers, GPUs attached to a PCIe bus on NUMA node 0 have lower latency to CPU0 memory. CPU pinning and NUMA-aware allocation reduce PCIe transfer latency.' },
      { q: 'What is the Blackwell FP4 tensor core capability?', a: 'Blackwell 4th-gen tensor cores natively execute FP4 operations at 2x the throughput of FP8, enabling higher throughput for quantized LLM inference at acceptable accuracy loss.' },
      { q: 'What is HBM and why does it matter?', a: 'High Bandwidth Memory -- stacked DRAM connected via a silicon interposer to the GPU die. Provides 3-8x the bandwidth of GDDR memory at the cost of smaller capacity, critical for LLM weight access.' },
      { q: 'What is the roofline model?', a: 'A visual performance model plotting achieved FLOPS vs arithmetic intensity against the hardware memory bandwidth and compute ceilings, showing whether a kernel is memory-bound or compute-bound.' },
    ],

    keyQuestions: [
      {
        question: 'Explain the GPU execution hierarchy from grid to thread and how it maps to hardware.',
        answer: `The CUDA programming model has a three-level hierarchy: grid, block, and thread. When a kernel is launched, the programmer specifies a grid shape (number of blocks) and a block shape (number of threads per block). The hardware maps this hierarchy onto physical SM units.

A grid is the full work set for a kernel launch. It contains one or more thread blocks (also called cooperative thread arrays or CTAs). Each thread block is assigned to one SM for its lifetime and cannot migrate. This means a thread block can use shared memory and \`__syncthreads()\` to coordinate because all its threads execute on the same SM. The maximum thread block size is 1024 threads.

Within an SM, threads execute in groups of 32 called warps. The SM warp scheduler dispatches warps to execution units. Multiple warps may be resident on one SM simultaneously (occupancy is the fraction of maximum resident warps that are active), providing the latency hiding that makes GPUs efficient: while one warp stalls on a memory load, another ready warp executes.

> [!TIP] Occupancy is not a goal in itself — it is the mechanism by which the GPU hides memory latency. A kernel with 50% occupancy and no stalls can outperform one at 100% occupancy with heavy stalls.

The practical consequence: if a kernel has too few threads to fill all SMs, some SMs sit idle and you waste the GPU. If a thread block is too large, register pressure forces reduced occupancy. If branches diverge within a warp, the SM serially executes each divergent path. Optimal kernel design requires choosing block sizes that maximize SM occupancy and avoid warp divergence, which the profiler reveals via the achieved occupancy metric.`,
      },
      {
        question: 'What is the roofline model and how do you use it to diagnose a slow kernel?',
        answer: `The roofline model is a visual framework for diagnosing whether a kernel is limited by compute throughput or memory bandwidth. It plots a kernel achieved performance (FLOPS/second, y-axis) against its arithmetic intensity (FLOPS per byte of DRAM traffic, x-axis), on top of two hardware ceilings.

The horizontal ceiling is the peak compute throughput in TFLOPS (e.g., 1979 TFLOPS BF16 on H100 SXM5). The diagonal line is the peak memory bandwidth multiplied by arithmetic intensity (3.35 TB/s on H100 SXM5). The intersection of these two lines is the ridge point -- the arithmetic intensity above which a kernel can be compute-bound.

To diagnose a kernel: measure its FLOPS/s and its bytes accessed. If the point falls far below the diagonal line, the kernel is memory-bound -- it cannot issue memory requests fast enough. The fix is to reduce memory traffic by increasing arithmetic intensity through tiling (processing data in blocks that fit in shared memory and reuse it multiple times) or kernel fusion (merging operations to avoid round-trips through HBM). If the point is on the diagonal but far below the horizontal ceiling, the bottleneck is bandwidth, not compute, and the fix is better caching or access patterns.

> [!TIP] For LLM workloads: attention with a short sequence length is highly memory-bound (low arithmetic intensity) and lives on the left of the roofline. GEMM for large matrix multiplications sits at high arithmetic intensity and is compute-bound. This is why FlashAttention's primary optimization is increasing arithmetic intensity by fusing the attention computation into a single pass that keeps QKV in shared memory rather than round-tripping through HBM.`,
      },
      {
        question: 'Compare NVLink, InfiniBand, and PCIe for multi-GPU AI systems.',
        answer: `The three interconnects serve different tiers of the multi-GPU communication hierarchy and have wildly different bandwidth characteristics that directly determine which parallelism strategies are viable.

PCIe (PCIe 5.0 provides 128 GB/s bidirectional) connects the CPU and GPUs on a server. It is the slowest GPU-to-GPU path and makes tensor parallelism impractical for large models: AllReduce across 8 GPUs over PCIe would bottleneck every forward pass.

NVLink (NVLink 4.0 on Hopper: 900 GB/s bidirectional between a GPU pair; NVSwitch extends this to all GPU pairs within a node) is NVIDIA proprietary intra-node fabric. In a DGX H100 with 8 GPUs connected by NVSwitch, any GPU can send to any other at full 900 GB/s. This enables tensor parallelism across up to 8 GPUs per node with reasonable efficiency. NVLink 5.0 on Blackwell increases this to 1.8 TB/s.

InfiniBand (NDR400, 400 Gb/s = 50 GB/s per link) connects nodes in a cluster. The bandwidth is 10-20x lower than NVLink, so inter-node communication is the bottleneck in distributed training. This gap drives the practice of using tensor parallelism (highest communication volume) within a node over NVLink, and pipeline parallelism or data parallelism (lower communication volume) across nodes over InfiniBand. NVIDIA SHARP offloads AllReduce collective computation to InfiniBand switches, reducing the data that needs to traverse the full network during gradient aggregation.`,
      },
    ],

    visualizations: [
      {
        title: 'GPU Hardware Hierarchy: SM, Warp, Tensor Core, Memory',
        description: `GPU execution hierarchy and memory levels.

Hardware unit breakdown (NVIDIA H100 SXM5):
- 132 Streaming Multiprocessors (SMs)
- Each SM: 128 FP32 CUDA cores, 4 tensor core groups, 256 KB shared memory/L1, 64 KB register file
- Maximum 2048 resident threads per SM = 64 warps per SM
- L2 cache: 50 MB shared across all SMs
- HBM3: 80 GB, 3.35 TB/s

Execution hierarchy:
Grid (all work) -> Thread blocks (assigned to one SM) -> Warps (32 threads, hardware scheduling unit) -> Threads (1 CUDA lane)

SIMT execution: all 32 threads in a warp fetch the same PC. Divergence (if/else) serializes paths -- cost = (number of divergent paths - 1) warp execution slots.

Tensor core operation:
D = A * B + C
A (16x16 BF16), B (16x16 BF16), C (16x16 FP32 accumulator), D (16x16 FP32)
One tensor core instruction executes this in 1 clock cycle = 8192 FP16 FLOPs.

Memory latency hierarchy:
- Registers: 1 cycle
- Shared memory (SMEM): ~4-20 cycles, 32 banks
- L1/Texture cache: ~28 cycles
- L2 cache: ~100-200 cycles
- HBM (global memory): ~500-800 cycles, 3.35 TB/s peak

Key bandwidth numbers:
- H100 HBM3: 3.35 TB/s
- H100 NVLink 4.0 (per GPU): 900 GB/s bidirectional
- GB200 HBM3e: 8 TB/s
- GB200 NVLink 5.0: 1.8 TB/s
- PCIe 5.0: 128 GB/s bidirectional
- InfiniBand NDR400: 50 GB/s per link

Roofline ceilings (H100 SXM5):
- Peak FP32: 67 TFLOPS
- Peak BF16 tensor: 1979 TFLOPS
- Peak FP8 tensor: 3958 TFLOPS
- Memory BW: 3.35 TB/s
- Ridge point (BF16): 1979 TFLOPS / 3.35 TB/s = ~591 FLOPs/byte`,
        image: '/diagrams/ai-perf/gpu-architecture-overview.png',
      },
    ],
  },

  // ─── 2. CUDA Memory Hierarchy & Access Patterns ──────────────────────────
  {
    id: 'cuda-memory-hierarchy',
    title: 'CUDA Memory Hierarchy & Access Patterns',
    icon: 'zap',
    color: '#6366f1',
    questions: 10,
    description: 'Coalesced global memory access, tiling with shared memory, bank conflicts, warp shuffle intrinsics, and asynchronous memory prefetching (TMA). The techniques behind FlashAttention and high-performance GEMM.',
    introduction: `Memory access patterns are the single most impactful factor in GPU kernel performance. A kernel that accesses HBM with poor patterns can achieve only 10% of the hardware peak bandwidth, while a well-optimized kernel can reach 90%+. Understanding how the GPU memory hierarchy works -- and how to exploit it -- is essential for writing and evaluating GPU kernels in interviews.

## Global Memory Coalescing

When a warp of 32 threads issues a load instruction, the GPU memory controller tries to satisfy the 32 requests with as few cache line transactions as possible. A cache line is 128 bytes. If all 32 threads access consecutive 4-byte floats starting at a 128-byte aligned address, the entire warp request is served in one 128-byte transaction. This is coalesced access. If threads access random addresses, the controller issues up to 32 separate transactions, reducing effective bandwidth by 32x. The rule: the i-th thread should access address \`base + i*stride\` where stride = 1 (unit stride) for coalesced access.

> [!WARNING] Uncoalesced access (stride > 1 or random scatter) is the single most common cause of GPU kernel underperformance. A 32-way stride access wastes 97% of every cache line fetched and can drop effective HBM bandwidth from 3.35 TB/s to ~100 GB/s.

## Shared Memory and Tiling

Shared memory (SMEM) is a software-managed on-chip cache. Unlike L1 cache (hardware-managed), the programmer explicitly loads data from global memory into shared memory, computes on it, and writes results back. SMEM has ~10-30 cycle latency compared to ~500 cycles for HBM, so data that is reused across a thread block should be loaded once into SMEM and read multiple times.

Tiling is the algorithm that makes this possible. For matrix multiplication C = A * B, a naive kernel reads each element of A and B once per output element (O(N^3) reads). A tiled kernel divides C into square tiles. For each tile of C, threads cooperatively load the corresponding tiles of A and B into shared memory, then compute the partial sum from SMEM. The arithmetic intensity increases from 0.25 FLOPs/byte (naive) to tile_size/2 FLOPs/byte (tiled). A 16x16 tile gives 8 FLOPs/byte, enough to approach the roofline.

## Bank Conflicts

Shared memory is organized into 32 banks (matching the warp size). Each bank services one 4-byte request per cycle. If two threads in a warp access the same bank (at different addresses -- the same address is a broadcast and does not conflict), a bank conflict occurs and the access takes multiple cycles. The classic example is accessing a 32-element array with stride 32 -- all 32 threads access bank 0, causing 32-way bank conflicts. The fix is to pad the array by one element, making stride 33 and distributing accesses across banks.

## Warp Shuffle Intrinsics

\`__shfl_sync\` and its variants (\`__shfl_up_sync\`, \`__shfl_down_sync\`, \`__shfl_xor_sync\`) allow threads within a warp to exchange registers directly without going through shared memory. This is the lowest-latency communication within a warp. A warp-level sum reduction using \`__shfl_down_sync\` takes ~log2(32) = 5 steps, far faster than a shared-memory reduction that requires barriers. These are heavily used in softmax, layer norm, and attention kernels where per-row reductions over 128-head-dim vectors are common.

## Asynchronous Memory Prefetching and TMA

CUDA asynchronous copy API (\`cp.async\`, introduced in Ampere) and the Tensor Memory Accelerator (TMA, Hopper) allow DMA-style loads from global to shared memory that proceed while CUDA cores execute computations. This is the mechanism behind the "async pipeline" pattern used in high-performance GEMM: while the current tile is being computed, the next tile is being prefetched from HBM into SMEM asynchronously. TMA further extends this by allowing 2D and 3D strided copies with hardware-managed addressing, removing per-thread addressing overhead in the load path.

## Memory Access in Transformers

Transformer inference is memory-bandwidth-bound during autoregressive decoding. Each forward pass with a batch size of 1 reads all model weights (e.g., 140 GB for LLaMA-3 70B) for only O(seq_len) compute per weight -- extremely low arithmetic intensity. The optimization strategy is: (1) maximize batch size to increase arithmetic intensity, (2) quantize weights to reduce bytes loaded per step, (3) fuse operations to reduce the number of passes over memory. FlashAttention key insight is that the attention operation does O(seq_len^2) work but needs O(seq_len) memory if tiled correctly -- it avoids materializing the full NxN attention matrix in HBM.`,

    quickFire: [
      { q: 'What is coalesced memory access?', a: 'When all 32 threads in a warp access contiguous, aligned addresses, satisfying the entire warp load in a single 128-byte cache line transaction.' },
      { q: 'What causes a shared memory bank conflict?', a: 'Two or more threads in a warp accessing different addresses that map to the same SMEM bank, serializing those accesses. Padding arrays by 1 element is the standard fix.' },
      { q: 'What is the warp shuffle intrinsic used for?', a: '`__shfl_sync` allows threads in a warp to read each other registers directly, enabling low-latency warp-level reductions (sum, max) without shared memory barriers.' },
      { q: 'Why is arithmetic intensity important for attention?', a: 'Naive attention materializes a seq_len x seq_len matrix in HBM with O(seq_len^2) memory traffic. FlashAttention tiles the computation to SMEM, increasing arithmetic intensity and cutting HBM traffic by O(seq_len).' },
      { q: 'What is the purpose of tiling in GEMM?', a: 'To load tiles of A and B into shared memory and reuse them across multiple output computations, increasing arithmetic intensity from O(1) FLOPs/byte to O(tile_size) FLOPs/byte.' },
      { q: 'What is TMA in CUDA?', a: 'Tensor Memory Accelerator -- a Hopper hardware unit that performs DMA-style 2D/3D strided copies from global to shared memory with hardware addressing, enabling async prefetch with near-zero compute overhead.' },
      { q: 'What is the L2 cache size on H100?', a: '50 MB, shared across all 132 SMs. It is the last level before HBM and buffers repeated accesses to the same memory region across blocks.' },
      { q: 'How many banks does shared memory have?', a: '32 banks, each 4 bytes wide (matching the 32-thread warp). A conflict-free access pattern hits each bank at most once per warp instruction.' },
      { q: 'What is the cp.async instruction?', a: 'A CUDA instruction (Ampere+) that initiates an asynchronous load from global to shared memory, returning control to the warp immediately. Used for double-buffering / software prefetching in GEMM kernels.' },
      { q: 'When does uncoalesced access occur in practice?', a: 'When threads access a row-major 2D array column-by-column (stride = number of columns), or when indexing into a lookup table with scattered indices.' },
    ],

    keyQuestions: [
      {
        question: 'Walk through a tiled matrix multiplication kernel -- how does it improve performance over the naive version?',
        answer: `The naive matrix multiplication kernel assigns one thread to compute one output element C[row][col] = sum(A[row][k] * B[k][col] for k in 0..K). Each thread independently loads the full row of A and full column of B from global memory. For an NxN matrix, this is O(N) global memory loads per thread and O(N^3) total loads for the kernel. If N=1024, each thread loads 1024 floats = 4 KB from HBM. The arithmetic intensity is 2 FLOPs per 8 bytes = 0.25 FLOPs/byte, far below the ridge point. The kernel is memory-bandwidth-bound.

The tiled version divides the output matrix C into square tiles of size T x T (e.g., 16x16 or 32x32). A thread block of T x T threads computes one tile of C. The computation proceeds in K/T phases: in each phase, the thread block cooperatively loads the corresponding T x T tiles of A and B into shared memory (each thread loads one element), synchronizes with \`__syncthreads()\`, then each thread computes its partial dot product contribution from the SMEM tiles (T multiplications and additions), and accumulates the result in a register. After K/T phases, the register holds the final C value.

The improvement: each element loaded into SMEM is reused T times within that phase (every row-thread uses the same B tile element, every col-thread uses the same A tile element). The arithmetic intensity becomes 2*T FLOPs / 8 bytes = T/4 FLOPs/byte. For T=32, that is 8 FLOPs/byte, a 32x improvement over naive. The memory traffic from HBM drops from O(N^3) to O(N^3/T) loads.

> [!TIP] In practice, high-performance GEMM kernels (CUTLASS, cuBLAS) use hierarchical tiling: large tiles at the thread block level (e.g., 128x128), smaller tiles at the warp level, and register tiles at the thread level, with async prefetch using TMA to overlap the next tile load with the current tile computation. This achieves 70-80% of BF16 tensor core peak.`,
      },
      {
        question: 'Explain FlashAttention and why it dramatically reduces memory usage compared to standard attention.',
        answer: `Standard attention computes three operations: (1) S = Q * K^T (an NxN score matrix where N is sequence length), (2) P = softmax(S) (applied row-wise), (3) O = P * V. The naive implementation materializes S and P as full NxN matrices in HBM. For sequence length 8192 and batch size 32 in FP16, S alone occupies 8192^2 * 32 * 2 bytes = 4.3 GB. This materialization dominates memory usage and causes quadratic HBM traffic with sequence length.

FlashAttention (Dao et al., 2022) eliminates S and P from HBM entirely. The key insight is that softmax can be computed in a numerically stable way using only the online maximum and a running sum, which fit in registers. The algorithm tiles Q into blocks of rows (Br rows at a time, loaded into SMEM from HBM) and K, V into blocks of columns (Bc columns at a time). For each tile of Q, it iterates over all tiles of K/V, computing the partial softmax and updating the running output O in registers. The final O is written to HBM once.

The HBM traffic becomes O(N * d) -- only proportional to the sequence length times head dimension, not quadratic in sequence length. For N=8192, this is a ~50x reduction in memory reads/writes compared to naive attention.

FlashAttention-2 adds improvements: parallelizing over both Q tiles and K/V tiles (better SM utilization), reducing non-matmul FLOP count, and better work partitioning. FlashAttention-3 (Hopper-specific) uses warp specialization -- separate producer warps running TMA loads and consumer warps running tensor core operations -- and async pipelining to overlap data movement with computation, achieving ~75% of H100 BF16 theoretical peak for attention.

> [!IMPORTANT] FlashAttention is the standard attention implementation in PyTorch (\`F.scaled_dot_product_attention\`), vLLM, TensorRT-LLM, and all production LLM frameworks. Without it, long-context inference (100K+ tokens) would be impractical.`,
      },
      {
        question: 'How do you identify and fix a shared memory bank conflict?',
        answer: `Identifying bank conflicts requires profiling with Nsight Compute. The key metric is "Shared Memory Bank Conflicts" -- Nsight reports this as the number of extra cycles taken for shared memory accesses due to serialization. A conflict-free kernel shows 0 replays; a 32-way conflict shows 31 replays per instruction (32x serialization).

The root cause pattern: shared memory has 32 banks. Bank number = (address_in_bytes / 4) % 32. Two threads conflict if they access different addresses that land in the same bank.

The canonical example is tiled matrix multiplication with shared memory tile \`As[TILE][TILE]\`. If TILE = 32, then accessing a column (stride 32) maps all threads to bank 0, causing a 32-way bank conflict.

The standard fix is padding: declare \`As[TILE][TILE + 1]\`. Now \`As[row][col]\` is at offset (row * 33 + col) * 4. Adding +1 rotates the bank assignment by 1 for each row, distributing the column accesses across all 32 banks.

\`\`\`cuda
// Bank conflict version -- TILE=32, column access causes 32-way conflict
__shared__ float As[32][32];
// As[warpLane][5]: bank = (warpLane*32 + 5) % 32 = 5 for all lanes -> broadcast OK
// As[5][warpLane]: bank = (5*32 + warpLane) % 32 = warpLane -> conflict-free OK
// As[warpLane*32][0]: bank = (warpLane*32*32) % 32 = 0 for all -> 32-way CONFLICT

// Fix: pad by 1
__shared__ float As[32][33]; // +1 padding per row
// As[row][col] at offset (row*33 + col)*4
// Stride-32 col access: bank = (warpLane*33) % 32 = warpLane % 32 -> banks 0-31, no conflict
\`\`\`

The +1 padding adds 32 floats (128 bytes) of wasted SMEM per tile -- a negligible cost for the 32x throughput improvement on conflicted accesses.`,
      },
    ],

    visualizations: [
      {
        title: 'CUDA Memory Hierarchy: Latency, Bandwidth, and Optimization Techniques',
        description: `Memory levels, latencies, and optimization techniques.

Memory hierarchy (fastest to slowest):
1. Registers -- per-thread, ~255 per thread, 1-cycle latency
2. Shared Memory (L1) -- per-SM, 32-256 KB, ~4-20 cycles, 32 banks x 4 bytes, software-managed
3. L2 Cache -- per-GPU, 50 MB (H100), ~100-200 cycles, hardware-managed
4. HBM (Global Memory) -- 80 GB (H100), 3.35 TB/s, ~500-800 cycles

Coalescing rules:
- Coalesced: warp threads access consecutive aligned addresses -> 1 transaction per warp
- Uncoalesced: scattered accesses -> up to 32 transactions per warp (32x bandwidth waste)
- Best pattern: \`thread[i]\` accesses \`array[blockDim.x * blockIdx.x + threadIdx.x]\`

Tiling arithmetic intensity improvement:
- Naive GEMM: 2 FLOPs per 8 bytes = 0.25 FLOPs/byte (memory-bound)
- Tiled GEMM (T=16): 2*16 FLOPs per 8 bytes = 4 FLOPs/byte
- Tiled GEMM (T=32): 2*32 FLOPs per 8 bytes = 8 FLOPs/byte
- Production CUTLASS (T=128): ~32 FLOPs/byte (near compute-bound)

Bank conflict pattern and fix:
- 32 banks, 4 bytes/bank
- Bank number = (byte_offset / 4) % 32
- Conflict: two threads, same bank, different addresses -> serialized
- Fix: pad SMEM array dim by 1 to rotate bank assignments

FlashAttention memory savings:
- Standard attention: O(N^2) HBM traffic (materializes NxN score matrix)
- FlashAttention: O(N*d) HBM traffic (tiles computation to SMEM)
- For N=8192, d=128: 50x HBM traffic reduction`,
        image: '/diagrams/ai-perf/cuda-memory-hierarchy.png',
      },
    ],
  },

  // ─── 3. CUDA Kernel Profiling & Occupancy ────────────────────────────────
  {
    id: 'cuda-kernel-profiling',
    title: 'CUDA Kernel Profiling, Occupancy & the Roofline',
    icon: 'activity',
    color: '#6366f1',
    questions: 8,
    description: 'Nsight Systems and Nsight Compute workflow, occupancy tuning, warp stall analysis, ILP, warp divergence, and CUDA Graphs. How to go from a slow kernel to a fast one systematically.',
    introduction: `Profiling is the empirical method of AI performance engineering. Without measurement, optimization is guesswork. NVIDIA provides two complementary profilers: Nsight Systems for system-level timeline analysis (CPU/GPU overlap, NCCL communication, I/O), and Nsight Compute for kernel-level microarchitecture analysis (occupancy, memory throughput, pipeline efficiency). Understanding how to read and act on their output is an essential skill for any AI systems engineer.

## Nsight Systems vs Nsight Compute

Nsight Systems gives a timeline view of CPU and GPU activity side-by-side. It shows: which kernels are running, CPU-GPU synchronization points, data transfers over PCIe/NVLink, NCCL collective operations, and framework-level annotations (NVTX ranges). The primary question Nsight Systems answers is "why is the GPU idle?" -- gaps between GPU kernels indicate CPU-side bottlenecks, inefficient launch patterns, or blocking synchronizations.

Nsight Compute provides per-kernel microarchitecture analysis. It re-executes the target kernel with hardware performance counters enabled. Key sections: Memory Workload Analysis (bandwidth achieved vs peak, L1/L2/HBM hit rates), Compute Workload Analysis (FP32/TensorCore utilization, pipeline stall reasons), Occupancy (achieved warps per SM vs theoretical maximum), and Warp Stall Analysis (what the warp scheduler is waiting on).

## Occupancy

Occupancy is the ratio of active warps on an SM to the maximum number of warps an SM can theoretically support (64 on Hopper). Occupancy is not itself the goal -- it is the mechanism by which the GPU hides memory latency. With 100% occupancy, the warp scheduler always has a ready warp to dispatch while other warps stall on memory. With 25% occupancy, memory stalls leave the SM execution units idle.

Occupancy is constrained by three resources, whichever is most limiting: (1) register file -- if a kernel uses many registers per thread, fewer threads fit per SM; the compiler flag \`--maxrregcount\` can cap registers at the cost of register spilling; (2) shared memory -- if a kernel allocates large SMEM per block, fewer blocks fit per SM; (3) thread block size -- too small means few blocks per SM.

## Warp Stall Analysis

Nsight Compute "Warp Stall Reasons" section shows what the warp scheduler was waiting on when it could not issue instructions. Common stall reasons:

- Long Scoreboard (memory dependency): the warp issued a global load and is waiting for the data to arrive. Fix: tile into SMEM, prefetch, or reduce global memory traffic.
- Short Scoreboard (shared memory dependency): the warp issued a shared memory load. Fix: restructure access to avoid bank conflicts.
- Barrier (\`__syncthreads\`): all threads in the block must reach the barrier before any proceed. Fix: reduce barrier frequency or restructure code to overlap computation with synchronization.
- No Instruction (empty warp): the warp has no instruction to execute. Indicates insufficient parallelism -- increase grid or block size.

## Instruction-Level Parallelism (ILP)

ILP refers to having multiple independent instructions in flight within a single thread simultaneously. Increasing ILP is a key technique when occupancy cannot be increased further (register pressure prevents more threads per SM). The technique is loop unrolling: explicitly unroll a loop body 2-4x so the compiler can interleave independent loads and FMAs.

## CUDA Graphs

CUDA Graphs record a sequence of kernel launches and memory operations into a graph that the runtime can replay with minimal CPU-side overhead. Each kernel launch normally incurs ~5-20 microseconds of CPU latency. For inference workloads with many small kernels, the total launch overhead can be 1-5 ms per token. CUDA Graphs amortize this by replaying the entire graph with a single driver call. The constraint is that graph capture requires static kernel parameters; variable sequence lengths require conditional graph nodes (Hopper+) or separate graphs per sequence length bucket.

> [!TIP] vLLM, TensorRT-LLM, and SGLang all use CUDA Graph capture for the decode phase (where batch shapes are more predictable) while using eager mode for prefill. This hybrid approach captures ~80-90% of the graph replay benefit while maintaining flexibility for prefill.`,

    quickFire: [
      { q: 'What does Nsight Systems show that Nsight Compute does not?', a: 'System-level timeline: CPU activity, GPU kernel timelines, data transfers, NCCL operations, CPU-GPU synchronization, NVTX ranges. Nsight Systems answers "why is the GPU idle?".' },
      { q: 'What is occupancy?', a: 'The ratio of active warps per SM to the theoretical maximum (64 on Hopper). High occupancy hides memory latency by keeping other warps ready while a stalled warp waits for data.' },
      { q: 'What are the three resources that limit occupancy?', a: 'Registers per thread (limits threads per SM), shared memory per block (limits blocks per SM), and block size (too small means too few blocks per SM).' },
      { q: 'What does "Long Scoreboard" warp stall mean?', a: 'The warp is waiting for a global memory load to complete. Fix: move data into shared memory (tiling), use async prefetch, or reduce global memory traffic.' },
      { q: 'What is ILP and how do you increase it?', a: 'Instruction-level parallelism -- multiple independent instructions in flight within one thread. Increase via loop unrolling so the compiler can interleave independent loads and FMAs.' },
      { q: 'What is a CUDA Graph and when is it used?', a: 'A recorded sequence of GPU operations that can be replayed with a single driver call, eliminating per-kernel CPU launch overhead (~5-20 us). Critical for inference workloads with many small kernels.' },
      { q: 'What is the theoretical warp occupancy maximum on Hopper?', a: '64 warps per SM (2048 threads / 32 threads per warp). Achieving 50%+ occupancy is typically sufficient for full memory latency hiding.' },
      { q: 'What is --maxrregcount and what is its tradeoff?', a: 'A compiler flag that caps register usage per thread, increasing occupancy. Tradeoff: excess registers spill to local memory (L1/L2), adding latency if the spilled values are accessed frequently.' },
    ],

    keyQuestions: [
      {
        question: 'How would you systematically profile and optimize a slow GEMM kernel using Nsight tooling?',
        answer: `A systematic profiling workflow proceeds in three phases: system-level diagnosis, kernel-level diagnosis, and targeted optimization.

Phase 1 -- Nsight Systems timeline. Profile the workload and open the timeline. Check for: (a) GPU idle gaps between kernels -- these indicate CPU-side bottlenecks (memory allocation, host-side computation, synchronization); (b) data transfers blocking kernels -- H2D transfers on the same stream as kernels will serialize; use separate streams or prefetch data asynchronously; (c) NCCL communication time relative to compute time in distributed workloads.

Phase 2 -- Nsight Compute kernel analysis. Launch Nsight Compute on the target kernel. Key sections to read:

Memory Workload Analysis: compare achieved GB/s to peak HBM bandwidth. If achieved is less than 60% of peak, check the access pattern for strided/random accesses. Check L2 cache hit rate -- a low hit rate with high HBM traffic means data is being streamed without reuse, a signal to tile into SMEM.

Compute Workload Analysis: check tensor core utilization. If a GEMM kernel shows low tensor core utilization (<50%) but the problem is large, the kernel is not mapping the problem onto tensor cores efficiently. Check if tile sizes match tensor core dimensions (multiples of 16 for BF16 on Hopper).

Occupancy section: compare achieved warps per SM to theoretical maximum. Note the limiting resource (registers, SMEM, or block size). If registers are limiting, try reducing their use or accepting register spilling for simpler access patterns.

Warp Stall Analysis: identify the dominant stall reason. Long Scoreboard (global memory) -> tile into SMEM. Barrier (\`__syncthreads\`) -> minimize barriers, pipeline phases.

Phase 3 -- Optimization and verification. Apply the targeted fix (tiling, access pattern, async copy, block size tuning), rebuild, re-profile. The key discipline: change one thing at a time and re-measure.`,
      },
      {
        question: 'What is CUDA Graph pre-warming and why does it matter for LLM inference latency?',
        answer: `CUDA Graph pre-warming means capturing and pre-compiling the computational graph of a model forward pass before the first real request arrives, so that inference can replay the pre-built graph rather than dynamically launching kernels.

In dynamic kernel launching, each inference step involves the Python/C++ runtime calling \`cudaLaunchKernel\` hundreds or thousands of times. Each launch takes 5-20 microseconds of CPU time to queue the kernel on the CUDA stream. For a transformer with 80 layers, each containing ~10 CUDA operations (RMSNorm, RoPE, QKV projection GEMM, attention, output projection GEMM, MLP GEMMs, residuals), that is ~800 kernel launches per forward pass. At 10us each, the launch overhead alone is 8ms -- comparable to the total GPU compute time for short sequences.

CUDA Graph capture records all of these launches in a single replay structure. After capture, replaying the graph requires one \`cudaGraphLaunch\` call. The CPU overhead drops to ~50-100 microseconds total. For an inference server targeting 20ms TTFT, this is a critical optimization.

The challenge for LLMs is dynamic shapes: sequence length changes between requests, batch sizes vary, and KV cache sizes differ. Solutions: (1) bucket sequence lengths (capture separate graphs for lengths 128, 256, 512, 1024...) and pad inputs to the nearest bucket -- wastes compute but enables graph replay; (2) Hopper conditional graph nodes that branch within the graph based on a device-side condition; (3) persistent kernels that loop internally and avoid re-launch overhead entirely.

> [!TIP] vLLM, TensorRT-LLM, and SGLang all use CUDA Graph capture for the decode phase (where batch shapes are more predictable) while using eager mode for prefill (variable-length, less latency-critical). This hybrid approach captures ~80-90% of the graph replay benefit while maintaining flexibility for prefill.`,
      },
    ],

    visualizations: [
      {
        title: 'Nsight Profiling Workflow and Occupancy Analysis',
        description: `Profiling decision tree for slow GPU kernels.

Step 1 -- Nsight Systems (system view):
- GPU idle? -> CPU bottleneck, synchronization, or data transfer overlap issue
- H2D transfers blocking? -> async prefetch, pinned memory, separate streams
- NCCL dominates? -> communication-compute overlap problem, check topology

Step 2 -- Nsight Compute (kernel view):
Memory section:
- Achieved BW < 60% peak -> coalescing issue or insufficient parallelism
- L2 hit rate < 50% -> streaming access, consider tiling
- SMEM bank conflicts > 0 -> pad shared memory arrays

Compute section:
- Tensor core utilization < 50% -> tile sizes do not match hardware (must be multiples of 16 for BF16)
- FP32 core utilization high but TC low -> operation not tensorized, add padding

Occupancy section:
- Limiting resource = registers -> try \`--maxrregcount\`, restructure algorithm
- Limiting resource = SMEM -> reduce shared memory allocation per block
- Achieved << theoretical -> long-latency stalls draining warp pool

Warp Stalls (dominant reason):
- Long Scoreboard -> move data to SMEM (tiling), async prefetch
- Short Scoreboard -> SMEM bank conflict, fix with padding
- Barrier -> reduce \`__syncthreads\` frequency
- Not Selected -> increase parallelism (more blocks/threads)

CUDA Graph capture benefit:
- Eager mode kernel launch overhead: N_kernels * ~10 us
- For LLaMA-3 70B (80 layers, ~10 ops each): 800 * 10us = 8ms overhead
- Graph replay overhead: ~100 us total
- Net savings: ~7.9ms per token decode step`,
        image: '/diagrams/ai-perf/cuda-kernel-profiling.png',
      },
    ],
  },

  // ─── 4. Distributed Training (NCCL) ──────────────────────────────────────
  {
    id: 'distributed-training-nccl',
    title: 'Distributed Training: NCCL, Collectives & Parallelism',
    icon: 'network',
    color: '#10b981',
    questions: 10,
    description: 'AllReduce, AllGather, ReduceScatter, and Broadcast collective operations. NCCL topology awareness, ring vs tree algorithms. Overlapping computation with communication. Data, tensor, pipeline, and sequence parallelism strategies.',
    introduction: `Training large models across hundreds or thousands of GPUs requires coordinating gradient exchange, weight distribution, and activation movement efficiently. The communication volume and latency characteristics of collective operations determine how well the training scales. NCCL (NVIDIA Collective Communications Library) is the standard collective communication library for GPU clusters and understanding its operation and optimization is fundamental to distributed training design.

## Collective Operations

A collective operation involves all GPUs (or a subset) in a communicator. The four operations critical for LLM training are:

AllReduce: each GPU contributes a tensor; every GPU receives the sum. Used to aggregate gradients across data-parallel workers. For a model with P parameters in FP32, the total communication volume is 2P * N_gpu floats (a ring AllReduce sends 2*(N-1)/N * P per GPU). AllReduce = ReduceScatter followed by AllGather.

ReduceScatter: each GPU contributes a tensor of size P; each GPU receives a different 1/N shard of the total sum. Used in FSDP for gradient reduction during the backward pass.

AllGather: each GPU contributes a shard of size P/N; every GPU receives the full tensor of size P. Used in FSDP to gather sharded weights before the forward pass. Also used in tensor parallelism to gather partial activations.

Broadcast: one GPU sends a tensor to all other GPUs. Used for initializing model weights from a checkpoint.

## NCCL Topology Awareness and Algorithms

NCCL automatically detects the GPU interconnect topology using NVLink, PCIe, and InfiniBand bandwidth measurements. It selects communication algorithms based on topology: ring algorithms for uniform bandwidth (each GPU sends to one neighbor in a ring, forwarding chunks until all data is distributed); tree algorithms for large communicator groups where ring bandwidth is limited by link saturation. Within a DGX node, NCCL exploits NVSwitch all-to-all connectivity by using a flat all-reduce rather than a ring, achieving near-peak NVLink bandwidth.

## Overlapping Computation with Communication

The key performance optimization in data parallel training is overlapping gradient communication with backward-pass computation. In DDP, PyTorch starts the AllReduce for a layer gradients as soon as that layer backward pass completes, while the backward pass continues through earlier layers. With ideal overlap, the AllReduce is complete by the time the optimizer step begins.

In FSDP2 (PyTorch 2.1+), the forward pass AllGathers weight shards before each layer is computed, and the backward pass ReduceScatters gradients before moving to the previous layer. FSDP2 uses async pre-fetching to overlap the AllGather for the next layer with the compute of the current layer, eliminating most communication stalls.

> [!TIP] Communication-compute overlap is the central performance technique in distributed training. Profiling with Nsight Systems shows the NCCL stream alongside the compute stream -- gaps where NCCL is idle while compute runs indicate under-utilized bandwidth, and vice versa.

## Parallelism Strategies

Data Parallelism (DP): replicate the full model on every GPU, split the batch across GPUs, aggregate gradients with AllReduce. Practical limit: models that fit on one GPU.

Tensor Parallelism (TP): split individual weight matrices across GPUs along columns or rows (Megatron-LM style). For a Linear layer Y = XW, split W column-wise across N GPUs; each GPU computes a partial result, then AllReduce sums them. TP is bandwidth-intensive and requires low-latency interconnect -- practical within a node over NVLink, impractical across nodes.

Pipeline Parallelism (PP): split model layers into stages assigned to different GPUs. Communication: point-to-point activation tensor transfer between adjacent stages. Tradeoff: pipeline bubbles (GPUs sitting idle while waiting for activations). Mitigation: 1F1B (one forward, one backward) interleaved schedule.

Sequence Parallelism (SP): distribute the sequence dimension across GPUs for attention and normalization layers. Used in combination with TP for very long sequences.

Expert Parallelism (EP): for Mixture-of-Experts models, each GPU hosts a subset of experts. Tokens are dynamically routed to the appropriate expert GPU via all-to-all communication.

## SHARP and In-Network Reduction

NVIDIA SHARP offloads AllReduce computation to the InfiniBand switch fabric, performing partial reductions at switch aggregation points. This halves the volume of data traversing the full bisection bandwidth and reduces AllReduce latency by up to 2x for large models across many nodes.`,

    quickFire: [
      { q: 'What is AllReduce and when is it used in training?', a: 'Every GPU sums its gradient tensor so every GPU ends with the global gradient sum. Used in data parallel training (DDP) to aggregate gradients across replicas.' },
      { q: 'What is ReduceScatter?', a: 'Like AllReduce but each GPU receives only a different 1/N shard of the summed tensor. Used in FSDP backward pass -- each GPU accumulates the gradient shard it owns.' },
      { q: 'What is AllGather?', a: 'Each GPU contributes a shard; all GPUs receive the full concatenated tensor. Used in FSDP forward pass to reconstruct full weight from shards before a layer computation.' },
      { q: 'Why is tensor parallelism limited to within a node?', a: 'TP requires an AllReduce per linear layer per pass. With NVLink (900 GB/s), this is fast enough. With InfiniBand (50 GB/s), the communication bottleneck makes TP across nodes impractical.' },
      { q: 'What is a pipeline bubble and how does 1F1B help?', a: 'A pipeline bubble is idle time waiting for activations from the previous stage. 1F1B interleaves forward and backward microbatches to reduce the bubble to 1/(number of microbatches).' },
      { q: 'What NCCL algorithm is used within a DGX node?', a: 'A flat all-reduce exploiting NVSwitch all-to-all connectivity, rather than a ring, achieving near-peak NVLink bandwidth.' },
      { q: 'What is expert parallelism?', a: 'In MoE models, each GPU hosts a subset of experts. Tokens are routed to the correct GPU via All-to-All collective, which is latency-critical and affected by expert load imbalance.' },
      { q: 'What is SHARP and what problem does it solve?', a: 'SHARP offloads AllReduce partial reductions to InfiniBand switch aggregation points. Halves network traffic and reduces AllReduce latency by up to 2x for large clusters.' },
      { q: 'What does NCCL_SOCKET_IFNAME control?', a: 'Which network interface NCCL uses for inter-node communication. Misconfiguration causes NCCL to use a management interface (1 Gbps) instead of the high-speed InfiniBand network (400 Gbps).' },
      { q: 'In a 4D parallelism setup (DP+TP+PP+SP), what does each dimension do?', a: 'DP replicates the model across replica groups; TP splits weight matrices within a layer across GPUs on one node; PP splits layers into stages across nodes; SP distributes sequence length for attention.' },
    ],

    keyQuestions: [
      {
        question: 'Compare FSDP and DDP for distributed training. When would you choose each?',
        answer: `DDP (DistributedDataParallel) replicates the complete model on every GPU. The forward and backward pass execute locally. Gradients are AllReduced after the backward pass. DDP memory per GPU = full model parameters + optimizer state + gradients. For a 7B parameter model in mixed precision with Adam optimizer: 7B * 2 bytes (BF16) + 7B * 8 bytes (Adam FP32 params + momentum + variance) + 7B * 4 bytes (gradients) = 14 GB + 56 GB + 28 GB = 98 GB per GPU. This exceeds a single A100 (80 GB HBM). DDP is practical only for models where the full replica fits in GPU memory.

FSDP (Fully Sharded Data Parallel) shards the model parameters, gradients, and optimizer states across all DP GPUs. Each GPU holds only 1/N of the parameters. Before computing a layer, the GPU AllGathers the full weight from all shards (temporary, discarded after the layer forward/backward). After the backward pass, gradients are ReduceScattered so each GPU receives only its gradient shard, then the optimizer step updates only the local shard. Memory per GPU with FSDP = (full model) / N + (working memory for one AllGathered layer at a time). For the same 7B model across 8 GPUs: 98 GB / 8 = 12.25 GB base, plus ~2-4 GB for the temporarily gathered layer. This fits comfortably on an 80 GB A100.

Choose DDP when: the model fits in GPU memory, communication overhead must be minimized, or you need simplicity.

Choose FSDP when: the model does not fit in GPU memory without sharding, you are training a 10B+ parameter model, or you need ZeRO-equivalent memory efficiency.

> [!TIP] FSDP2 (PyTorch 2.1+) adds prefetching the next layer AllGather while computing the current layer (eliminating communication stalls), mixed-precision per-parameter-group, and a simpler API. For large model training, FSDP2 with prefetch enabled achieves near-DDP compute efficiency while handling models that DDP cannot accommodate.`,
      },
      {
        question: 'How do you overlap communication with computation in distributed training?',
        answer: `Communication-computation overlap is the central performance technique in distributed training. The goal is to hide the communication latency of collective operations behind useful compute, so that measured throughput approaches the compute-bound ceiling.

In DDP, PyTorch autograd hooks register an AllReduce on each parameter group gradients as soon as those gradients are computed during the backward pass. The backward pass continues to earlier layers while the AllReduce for later layers proceeds asynchronously on a separate NCCL stream. The main stream and NCCL stream are synchronized only at the optimizer step. Configuration: the \`bucket_cap_mb\` parameter in DDP controls the gradient bucketing size -- larger buckets reduce the number of NCCL launches (better NCCL efficiency) but reduce overlap granularity. A typical value is 25-100 MB.

In FSDP2, the overlap pattern is different: the AllGather for layer L+1 weights is launched asynchronously while layer L compute is executing. Similarly, the ReduceScatter for layer L gradients is launched while layer L-1 backward compute runs. This requires FSDP to maintain a prefetch queue and issue NCCL communications based on the execution schedule.

For pipeline parallelism, the overlap is built into the 1F1B schedule: a GPU executes its stage backward pass while the next pipeline stage is executing forward pass, keeping both the compute units and the pipeline interconnect busy simultaneously.

> [!TIP] Profiling the overlap in Nsight Systems: gaps where the NCCL stream is not running while the compute stream is active indicate under-utilized communication bandwidth. Gaps where compute is not running while NCCL is active indicate compute being stalled waiting for communication.`,
      },
    ],

    visualizations: [
      {
        title: 'Collective Operations and Parallelism Strategy Selection',
        description: `NCCL collectives and parallelism strategy decision framework.

Collective operation summary:
- AllReduce = ReduceScatter + AllGather (ring algorithm)
  Traffic per GPU: 2 * (N-1)/N * M bytes (N=GPUs, M=message size)
  Use: DDP gradient aggregation
- ReduceScatter: each GPU receives 1/N shard of sum
  Traffic per GPU: (N-1)/N * M bytes
  Use: FSDP backward pass gradient sharding
- AllGather: each GPU receives full tensor from shards
  Traffic per GPU: (N-1)/N * M bytes
  Use: FSDP forward pass weight reconstruction
- All-to-All: each GPU sends different data to each other GPU
  Use: Expert Parallelism token routing in MoE

Parallelism strategy selection:
- Model fits in GPU memory, batch size large: DDP
- Model > GPU memory, single-node: FSDP (ZeRO-3 equivalent)
- Very large model, multi-node: FSDP + Pipeline Parallelism
- Multi-node + large attention head dim: add Tensor Parallelism within node
- MoE model: add Expert Parallelism for expert routing

Practical 4D parallelism for LLaMA-3 405B on 512 GPUs:
- DP=16 (16 replica groups of 32 GPUs)
- TP=8 (8 GPUs per node for tensor parallelism, uses NVLink)
- PP=4 (4 pipeline stages across 4 nodes, uses InfiniBand)
- SP=1 (sequence parallelism for long contexts, optional)
- FSDP shards within each DP group

Communication time estimates (H100 cluster, 405B params, BF16):
- DDP AllReduce: 405B * 4 bytes / (3.35 TB/s NVLink / 2) = ~500ms (infeasible without sharding)
- FSDP AllGather per layer: layer_params * 2 bytes / NVLink BW = ~1-5ms per layer
- Pipeline stage activation: hidden_dim * seq_len * batch * 2 bytes = ~100MB typical`,
        image: '/diagrams/ai-perf/distributed-training-nccl.png',
      },
    ],
  },

  // ─── 5. LLM KV Cache & Batching ──────────────────────────────────────────
  {
    id: 'llm-kv-cache-batching',
    title: 'LLM Inference: KV Cache, Batching & Scheduling',
    icon: 'layers',
    color: '#0ea5e9',
    questions: 12,
    description: 'KV cache mechanics, memory management, and paging (PagedAttention). Continuous batching (Orca), chunked prefill, prefix caching, and latency vs. throughput tradeoffs in LLM serving.',
    introduction: `LLM inference has fundamentally different performance characteristics from training. Training is compute-bound (large batches, reuse of weights, backward pass). Inference in production must balance two competing objectives: throughput (tokens per second across all users) and latency (time to first token and inter-token delay per user). The KV cache is the central data structure, and all serving optimizations -- batching, scheduling, memory management -- revolve around managing it efficiently.

## The KV Cache

Transformer attention requires, for each token position, the keys and values from all prior positions to compute the attention scores. During autoregressive generation, recomputing these for every new token would be O(N^2) in sequence length. The KV cache avoids this by storing the computed K and V tensors for all previous positions, appending the new token K and V on each step.

Memory cost: for each layer, the KV cache occupies 2 * seq_len * num_heads * head_dim * sizeof(dtype) bytes. For a 70B LLaMA-3 model with 80 layers, 8 GQA key-value heads, head dim 128, and FP16: 2 * seq_len * 8 * 128 * 2 = 4096 * seq_len bytes per layer, times 80 layers = 327,680 bytes per token. A single request with 4096 tokens uses 1.28 GB of GPU HBM just for the KV cache. With 80 GB HBM minus ~42 GB for model weights, there is ~38 GB available for KV cache -- about 30 simultaneous requests at 4096 tokens.

> [!WARNING] Managing the KV cache is the central scheduling problem in LLM serving. Running out of KV cache memory stalls new requests or forces expensive preemption of in-flight ones. Always size your KV cache budget before planning deployment.

## PagedAttention and vLLM

The naive KV cache allocation pre-allocates the maximum possible sequence length for each request, even if the request ultimately generates only 100 tokens. This wastes memory on internal fragmentation (reserved but unused space within a request) and external fragmentation (unable to serve a new request because remaining memory is insufficient even though total free space is enough in aggregate).

PagedAttention (the core of vLLM) manages KV cache using pages (blocks) of fixed size (typically 16 tokens per block). Each request has a sequence of logical pages that map to physical pages on the GPU, like virtual memory in an OS. Pages are allocated on demand as generation proceeds. When a request completes, its pages are immediately freed and returned to the pool. This eliminates pre-allocation waste, achieving near-zero fragmentation.

The result: vLLM achieves 2-4x higher throughput than Hugging Face TGI (without paged attention) by fitting more concurrent requests in the same memory.

## Continuous Batching (Orca)

Static batching waits until a fixed number of requests are ready, processes them as a batch, and returns all results together. This has high latency for requests that start first (must wait for the batch to fill) and wastes GPU cycles when requests in a batch generate different numbers of tokens.

Continuous batching (Orca, 2022) processes each token generation step as a batch across all currently-in-flight requests. When a request finishes (generates an EOS token), it is immediately removed from the batch and a new waiting request takes its slot in the next step. This keeps the GPU fully utilized at all times, eliminates head-of-line blocking, and ensures short requests return results immediately.

## Chunked Prefill

Prefill (computing the KV cache for the prompt tokens) and decode (generating one token at a time) have different computational profiles. Prefill with a long prompt is compute-intensive. Decode is memory-bandwidth-bound. Naively, a long prefill request monopolizes the GPU, delaying decode steps for other in-flight requests (high tail latency). Chunked prefill splits the prompt into fixed-size chunks (e.g., 512 tokens) and interleaves the prefill chunks with decode steps of ongoing requests. The tradeoff is slightly higher TTFT for the new request.

## Prefix Caching

Many requests share a common prefix (system prompt, few-shot examples, RAG context). With prefix caching, the KV cache for the common prefix is computed once and stored persistently. Subsequent requests with the same prefix reuse the cached KV tensors, paying only the cost of new tokens after the prefix. For a 2048-token system prompt shared across all requests, this eliminates ~50% of TTFT for each request.`,

    quickFire: [
      { q: 'What is the KV cache and why is it needed?', a: 'Stores computed key and value tensors from all prior positions to avoid O(N^2) recomputation during autoregressive decoding. Each new token only needs to compute its own K/V and attend to the cached history.' },
      { q: 'What is the memory cost of KV cache for LLaMA-3 70B at 4096 tokens?', a: 'About 1.28 GB per request (80 layers * 8 GQA heads * 128 head_dim * 4096 tokens * 2 bytes * 2 for K and V).' },
      { q: 'What problem does PagedAttention solve?', a: 'Internal and external fragmentation from pre-allocating max-sequence-length KV cache per request. Pages KV cache in fixed blocks (16 tokens), allocating on demand, achieving near-zero waste.' },
      { q: 'What is continuous batching and how does it differ from static batching?', a: 'Continuous batching processes each token step as a batch across all in-flight requests. Completed requests are immediately replaced by waiting ones, keeping GPU fully utilized and eliminating head-of-line blocking.' },
      { q: 'What is chunked prefill?', a: 'Splits a new request prompt into fixed-size chunks (e.g., 512 tokens) interleaved with ongoing decode steps, preventing long prefills from monopolizing the GPU and causing latency spikes for other users.' },
      { q: 'What is prefix caching?', a: 'Caches KV tensors for shared prompt prefixes (system prompts, RAG context). Subsequent requests sharing that prefix reuse the cached KV, skipping recomputation and reducing TTFT significantly.' },
      { q: 'Why is LLM decoding memory-bandwidth-bound?', a: 'Each decode step reads all model weights (e.g., 140 GB for 70B model) to generate one token. With batch size 1, compute is trivial but 140 GB must stream through the memory bus per step.' },
      { q: 'What is GQA (Grouped Query Attention) and how does it affect KV cache size?', a: 'GQA shares K/V heads across multiple Q heads. LLaMA-3 70B uses 8 K/V heads (vs 64 Q heads), reducing KV cache by 8x compared to MHA without quality degradation.' },
      { q: 'What is a radix tree in SGLang?', a: 'A prefix-sharing data structure that organizes all cached KV prefixes in a radix tree. Common prefixes are stored once and shared across requests, maximizing prefix cache hit rates.' },
      { q: 'What determines throughput vs latency tradeoffs in LLM serving?', a: 'Batch size drives the tradeoff. Large batches maximize throughput (amortize weight loads over more tokens) but increase TTFT and ITL for individual users. SLO-aware schedulers choose batch size per request.' },
      { q: 'What is the difference between TTFT and TPOT?', a: 'TTFT (Time To First Token) measures from request arrival to first generated token -- determined by prefill compute. TPOT (Time Per Output Token) measures inter-token decode latency -- determined by batch size and memory bandwidth.' },
      { q: 'What is request preemption in vLLM?', a: 'When GPU KV cache memory is exhausted, vLLM preempts a running request by moving its KV cache to CPU memory (swap) or recomputing it later, freeing GPU memory for higher-priority requests.' },
    ],

    keyQuestions: [
      {
        question: 'Explain PagedAttention in detail. How does it manage KV cache memory and what are its limits?',
        answer: `PagedAttention borrows the virtual memory and paging abstraction from OS design and applies it to KV cache management. The design addresses the two fragmentation problems that plague naive KV cache allocation.

In naive allocation, the server pre-allocates a contiguous GPU memory region equal to (max_sequence_length * bytes_per_token) for each incoming request, before knowing how long the response will be. A request that generates 50 tokens wastes the memory reserved for 4046 more tokens (internal fragmentation). When requests complete, they leave gaps in the GPU memory pool that are too small for new requests (external fragmentation). In practice, GPU utilization for KV cache memory drops to 20-40% due to fragmentation.

PagedAttention divides the KV cache into fixed-size blocks called pages (typical size: 16 tokens). Each page stores K and V tensors for 16 consecutive token positions in one layer. The server maintains a block table: a mapping from (request_id, logical_block_number) to physical_block_number in GPU HBM, similar to a page table in a virtual memory system.

When a new request arrives, the server allocates one physical block for the first 16 tokens of its KV cache. As generation proceeds past 16 tokens, a second block is allocated, and so on. Blocks are not required to be contiguous in memory -- the block table handles the indirection. When a request finishes, all its physical blocks are immediately returned to the free block pool.

For beam search, multiple beams that share a common prefix share the same physical blocks for that prefix through copy-on-write: the blocks are reference-counted, and a copy is made only when a beam diverges.

The limits of PagedAttention: (1) the block table adds ~50-100 ns of indirection per attention operation; (2) the fixed block size (16 tokens) means requests shorter than one block still use a full block (minor fragmentation); (3) on-device KV cache is still the bottleneck -- PagedAttention manages GPU memory more efficiently but does not eliminate the memory constraint for very long contexts or large batch sizes.`,
      },
      {
        question: 'How do you architect an LLM serving system to handle both latency-sensitive and throughput-sensitive workloads simultaneously?',
        answer: `Mixing latency-sensitive (interactive) and throughput-sensitive (batch) workloads requires a serving architecture that provides differentiated SLOs without allowing batch workloads to starve interactive users or vice versa.

The core design uses priority queues and preemptive scheduling at the token-step level. Assign each request a priority class: interactive (TTFT < 500ms, TPOT < 100ms) and batch (no TTFT requirement, maximize throughput). The scheduler maintains separate queues. At each decode step, the token batch is composed primarily of interactive requests, with batch requests filling remaining capacity.

When an interactive request arrives during a heavy batch workload, the system needs to immediately allocate KV cache memory and start its prefill. If GPU memory is fully committed to batch requests, preemption is triggered: the lowest-priority batch request has its KV cache swapped to CPU DRAM, freeing GPU memory. This is painful for the preempted request but maintains the interactive SLO.

For production systems serving both workloads, the cleanest architecture is disaggregated serving: run a dedicated prefill cluster (optimized for compute throughput, large batch prefill) and a dedicated decode cluster (optimized for decode throughput, continuous batching, latency-sensitive). Interactive requests go to high-priority decode workers; batch inference goes to batch workers. The KV cache is transferred from prefill workers to decode workers after prefill completes.

> [!TIP] Chunked prefill is the alternative for a non-disaggregated deployment: split prefill of new interactive requests into small chunks (256-512 tokens) and interleave them with decode steps of ongoing requests. This bounds the latency penalty to existing decode requests while ensuring interactive requests begin generating within a bounded time window.`,
      },
    ],

    visualizations: [
      {
        title: 'KV Cache Memory Management: PagedAttention vs Naive Allocation',
        description: `KV cache architecture and serving system design.

KV cache memory breakdown (LLaMA-3 70B, FP16, 4096 tokens):
- Per token per layer: 2 (K+V) * 8 GQA heads * 128 head_dim * 2 bytes = 4096 bytes
- Per token total: 4096 bytes * 80 layers = 320 KB
- Per request (4096 tokens): 320 KB * 4096 = 1.25 GB
- H100 80GB available for KV cache: ~38 GB (after model weights ~42 GB)
- Max concurrent requests: 38 GB / 1.25 GB = ~30 requests (naive pre-allocation)

Naive allocation fragmentation:
- Pre-allocate max_seq_len = 4096 tokens even if request generates 50 tokens
- 50-token response wastes: (4096 - 50) / 4096 = 98.8% of allocated memory
- Effective KV cache utilization: 20-40%

PagedAttention improvement:
- Block size: 16 tokens = 5 MB per block (70B model)
- Allocate blocks on demand as tokens are generated
- Fragmentation: at most 1 block per request (15 tokens wasted max)
- Effective KV cache utilization: 90-95%
- Result: 2-4x more concurrent requests in same GPU memory

Continuous batching token step:
- Time 0: requests [A(prefill), B(decode), C(decode)] -> batch together
- Time 1: [A(decode t=1), B(decode t=2), C(DONE -> remove)]
- Time 2: [A(decode t=2), B(decode t=3), D(prefill start, from queue)]
- Each step: GPU processes exactly one token per in-flight request

Key metrics:
- TTFT (Time to First Token): prefill latency, compute-bound
- TPOT (Time Per Output Token): decode latency, memory-bound
- Throughput: total tokens/sec across all requests, batch-size-driven
- ITL (Inter-Token Latency): same as TPOT`,
        image: '/diagrams/ai-perf/llm-kv-cache-batching.png',
      },
    ],
  },

  // ─── 6. Disaggregated Prefill-Decode Architecture ────────────────────────
  {
    id: 'disaggregated-prefill-decode',
    title: 'Disaggregated Prefill-Decode Architecture',
    icon: 'layers',
    color: '#0ea5e9',
    questions: 8,
    description: 'Separating compute-bound prefill and memory-bound decode onto independent GPU pools for independent scaling. KV cache transfer mechanisms, routing, SLO-aware scheduling, and disaggregated KV cache pools.',
    introduction: `Disaggregated prefill-decode (PD disaggregation) is the architectural approach that best resolves the fundamental tension in LLM inference: prefill and decode have opposite compute characteristics, but in a co-located deployment, they share GPU resources and create interference. PD disaggregation assigns each phase to a dedicated pool of GPUs, allowing each pool to be hardware-sized and software-optimized independently.

## Why Prefill and Decode Are Different

Prefill processes the entire prompt in parallel. For a 2048-token prompt and a 70B model with tensor parallelism, the linear layers compute large matrix products. Arithmetic intensity is high (hundreds of FLOPs/byte). Prefill is GPU compute-bound -- it keeps tensor cores busy and scales well with compute density. Prefill hardware should maximize TFLOPS per dollar.

Decode generates one token per step. Linear layers compute a matrix-vector product with batch size 1 (or small batch B). Arithmetic intensity drops to approximately B * 2 / (weight_bytes_per_output) -- for B=1, this is below 1 FLOPs/byte, far below the ridge point. Decode is memory-bandwidth-bound. Hardware should maximize HBM bandwidth per dollar.

> [!TIP] This asymmetry means the optimal GPU for prefill (maximizing TFLOPS) and the optimal GPU for decode (maximizing HBM bandwidth per dollar) can be different hardware generations. PD disaggregation lets you mix hardware optimally.

## The Co-Located Interference Problem

In co-located serving (prefill and decode on the same GPUs), a long prefill request competes with decode requests for GPU resources. During the prefill phase, ongoing decode requests see increased inter-token latency (the GPU is busy with prefill compute). This is head-of-line blocking at the GPU level. Even with chunked prefill, there is a fundamental tradeoff: smaller chunks reduce decode interference but extend TTFT; larger chunks improve TTFT but increase decode latency spikes.

## PD Disaggregation Architecture

In a disaggregated system, a prefill cluster and a decode cluster operate independently. When a request arrives at the serving router:

1. The router assigns the request to a prefill worker.
2. The prefill worker computes the full KV cache for the prompt in one shot (no chunking needed).
3. The KV cache is transferred from the prefill worker to the decode worker over NVLink (same-rack) or InfiniBand (cross-rack).
4. The decode worker appends the request to its continuous batch and begins autoregressive generation.

The KV transfer is the critical path for TTFT: a 2048-token KV cache for a 70B GQA model is approximately 655 MB. Over InfiniBand NDR (50 GB/s), this takes ~13 ms. Over NVLink 4.0 (900 GB/s), this drops to ~0.7 ms. NVIDIA NIXL (NVLink-based Transfer Library) is designed specifically for low-latency KV cache migration.

## Disaggregated KV Cache Pools

A further extension disaggregates the KV cache storage from the decode GPU. A KV cache pool (on CPU DRAM, SSD, or a dedicated KV cache server) holds the KV caches of active requests. The decode GPU streams KV blocks from the pool as needed. This enables KV caches to exceed the decode GPU HBM capacity -- critical for long-context (128K+ token) workloads.

## Production Implementations

Mooncake (Kimi/Moonshot, 2024) separates prefill and decode pools and uses a KV cache scheduler that manages cache locality -- scheduling requests to decode workers whose KV cache is already resident, reducing KV transfer costs. DistServe (Berkeley, 2024) provides a research formalization showing that optimal prefill:decode GPU ratio depends on the prompt/generation length ratio and SLO targets.`,

    quickFire: [
      { q: 'Why is prefill compute-bound but decode memory-bound?', a: 'Prefill processes many tokens in parallel (high arithmetic intensity GEMM). Decode processes one token per step (batch size 1 GEMV with tiny FLOPs but full weight load from HBM).' },
      { q: 'What is the KV cache transfer cost in PD disaggregation?', a: 'Proportional to KV cache size. For 70B GQA model, 2048-token prompt: ~655 MB. At 50 GB/s InfiniBand: ~13 ms. At 900 GB/s NVLink: ~0.7 ms.' },
      { q: 'What is NIXL?', a: 'NVIDIA NVLink-based Transfer Library for low-latency KV cache migration between prefill and decode workers within a DGX SuperPod fabric.' },
      { q: 'What is the head-of-line blocking problem in co-located serving?', a: 'Long prefill requests monopolize the GPU during prefill, delaying decode steps for ongoing requests, causing latency spikes. PD disaggregation eliminates this by isolating prefill and decode GPUs.' },
      { q: 'What determines the optimal prefill:decode GPU ratio?', a: 'The prompt-to-generation length ratio and SLO targets. Long prompts need more prefill capacity; high throughput requirements favor more decode capacity. Workload-specific optimization.' },
      { q: 'What is a disaggregated KV cache pool?', a: 'Stores KV caches in CPU DRAM or SSD separate from the decode GPU, allowing KV caches larger than HBM capacity. Decode GPU streams blocks from the pool as needed.' },
      { q: 'How does Mooncake improve scheduling efficiency?', a: 'KV cache locality scheduling: assigns requests to decode workers that already hold the request KV cache, eliminating KV transfer for repeated or cached prefixes.' },
      { q: 'What is chunked prefill and when should you use PD disaggregation instead?', a: 'Chunked prefill interleaves prefill and decode on the same GPU -- simpler but cannot fully eliminate interference. PD disaggregation completely separates phases -- better for high-traffic production systems with strict latency SLOs.' },
    ],

    keyQuestions: [
      {
        question: 'Design a PD disaggregated serving system for a high-traffic LLM endpoint with TTFT < 500ms and TPOT < 50ms SLOs.',
        answer: `The system has three layers: routing, prefill cluster, and decode cluster, with a KV transfer fabric between prefill and decode.

Routing layer: a stateless load balancer receives inference requests. It routes based on: (1) prompt length (longer prompts to prefill workers with higher TP degree for faster processing); (2) active decode load (send to decode workers with available KV cache capacity); (3) prefix cache hit (prefer decode workers with the shared prefix already cached).

Prefill cluster design: compute-bound workload optimized for TFLOPS. Use H100 SXM5 (1979 BF16 TFLOPS) with tensor parallelism TP=8 per node. Each prefill node handles one request at a time, running the full prompt through all transformer layers in one forward pass. For a 2048-token prompt and 70B model with TP=8, prefill latency is approximately ~120 ms. This meets the 500ms TTFT budget including the KV transfer.

Decode cluster design: memory-bound workload optimized for HBM bandwidth. H100 provides 3.35 TB/s HBM bandwidth. With continuous batching, the maximum throughput is 3.35 TB/s / model_size_bytes * batch_size per step. For 70B at BF16 (140 GB): 3.35 TB/s / 140 GB * batch_size = 24 steps/sec per batch. With batch size 32: 24 * 32 = 768 tokens/sec per node, each with ~42 ms TPOT. This meets the 50ms TPOT SLO.

KV cache transfer: prefill nodes push KV cache to decode nodes immediately after prefill. 70B GQA KV cache for 2048 tokens = 655 MB. At 50 GB/s IB: 13 ms transfer. Total TTFT = prefill_latency + KV_transfer = 120 + 13 = 133 ms, well within the 500ms budget.

SLO enforcement: implement admission control at the router. If decode workers queue depth exceeds N pending requests or KV cache utilization exceeds 90%, reject new low-priority requests (return 429). High-priority requests preempt by swapping low-priority KV caches to CPU DRAM. Monitor TTFT and TPOT per request with P99 tracking; auto-scale prefill or decode pools based on sustained SLO violations.

Sizing for 1000 requests/sec with avg 512 token prompts and 256 token responses:
- Prefill load: 1000 req/s * 512 tokens/req = 512K tokens/sec prefill
- Prefill nodes needed: 512K tokens/sec / ~8192 tokens/node-sec with TP=8 = ~63 prefill nodes
- Decode nodes needed: target batch=64 per node, 1000 concurrent active requests / 64 = ~16 decode nodes
- Ratio: ~4:1 prefill:decode, which makes sense for long prompt, short generation workloads.`,
      },
    ],

    visualizations: [
      {
        title: 'PD Disaggregation: Architecture and Data Flow',
        description: `Disaggregated prefill-decode system architecture.

Co-located problem:
- Prefill long prompt: GPU busy for 200ms -> decode latency for all other requests jumps 200ms
- Even with chunked prefill: tradeoff between TTFT and decode spikes is unavoidable
- GPU utilization: prefill is compute-bound, decode is memory-bound -- cannot be simultaneously optimized

PD disaggregation data flow:
1. Request arrives at router
2. Router selects prefill worker (based on queue depth, TP degree)
3. Prefill worker: full forward pass over all prompt tokens, generate KV cache
4. KV cache transferred: prefill worker -> decode worker via NIXL/RDMA
5. Decode worker: appends request to continuous batch, begins token generation
6. Tokens streamed back to client via SSE

Prefill cluster specs:
- Hardware: H100 SXM5, TP=8 within node
- Optimization: large batch prefill, no chunking needed
- Metric to optimize: prefill throughput (prompt tokens/sec)

Decode cluster specs:
- Hardware: H100 or A100 (HBM bandwidth per dollar matters more than FLOPS)
- Optimization: continuous batching, PagedAttention, CUDA Graphs for decode
- Metric to optimize: decode throughput (tokens/sec/GPU) at target TPOT

KV transfer sizing (70B GQA, FP16):
- KV bytes per token: 80 layers * 2 (K+V) * 8 GQA heads * 128 dim * 2 bytes = 327,680 bytes
- 2048-token KV: 655 MB
- Transfer at IB NDR (50 GB/s): ~13 ms
- Transfer at NVLink 4.0 (900 GB/s): ~0.7 ms

Optimal prefill:decode ratio (DistServe model):
- Short prompts, long generation: 1:4 (decode-heavy)
- Long prompts, short generation: 4:1 (prefill-heavy)
- Production default (balanced): 2:1 to 3:1`,
        image: '/diagrams/ai-perf/disaggregated-prefill-decode.png',
      },
    ],
  },

  // ─── 7. Speculative Decoding ──────────────────────────────────────────────
  {
    id: 'speculative-decoding',
    title: 'Speculative Decoding & Parallel Token Generation',
    icon: 'zap',
    color: '#8b5cf6',
    questions: 8,
    description: 'Draft-then-verify speculative decoding, Medusa multi-head prediction, EAGLE speculative decoding, lookahead decoding. Acceptance rate, speedup formula, and when speculation hurts.',
    introduction: `Speculative decoding addresses the fundamental inefficiency of autoregressive LLM generation: the model generates exactly one token per forward pass, regardless of how simple or predictable that token is. For common sequences (code boilerplate, structured text), many tokens are nearly deterministic. Speculative decoding exploits this by having a fast draft model speculatively generate multiple tokens, then having the large target model verify them all in a single parallel forward pass -- recovering multiple tokens for the cost of one target model pass.

## The Speculative Decoding Algorithm

The core algorithm (Leviathan et al., 2022; Chen et al., 2022) uses a small draft model (speculator) and a large target model (verifier). The draft model generates K tokens speculatively (a draft sequence). The target model then performs one forward pass over all K+1 tokens simultaneously, computing the probability distribution at each position. A token-level acceptance/rejection procedure based on speculative sampling ensures the final output distribution matches exactly the target model distribution:

For each draft token at position i: if p_target(x_i) >= p_draft(x_i), accept with probability 1. Otherwise, accept with probability p_target(x_i) / p_draft(x_i). If rejected, sample the corrected token from the adjusted distribution and stop accepting further draft tokens.

This guarantees losslessness: the output distribution is identical to running the target model without speculation. The speedup factor equals the average acceptance length -- how many tokens are accepted before the first rejection. For acceptance rate alpha, the expected accepted tokens per draft equals alpha * (1 - alpha^K) / (1 - alpha). With alpha = 0.8 and K=4, the expected run length is ~3.4 tokens. The target model does one pass to verify 3.4 tokens -- 3.4x throughput improvement over pure autoregressive.

## Medusa

Medusa (Cai et al., 2024) eliminates the separate draft model by adding multiple prediction heads to the target model itself. Each head predicts a token at a future position: head 1 predicts token t+1, head 2 predicts token t+2, etc. All heads compute simultaneously during the normal forward pass by reusing the last-layer hidden states. Verification uses a tree-structured attention mask to verify multiple possible continuations in one pass. Medusa adds 5-10% parameter overhead and achieves 2-3x speedup at batch=1.

## EAGLE

EAGLE is a more accurate speculative decoding approach that uses a small auto-regressive draft model trained to predict the target model feature embeddings rather than tokens directly. By operating in the embedding space, EAGLE achieves higher acceptance rates (0.85-0.90 vs Medusa 0.75-0.80). EAGLE-2 adds dynamic draft tree construction, selecting which speculative paths to explore based on acceptance probability estimates.

## When Speculative Decoding Helps (and When It Hurts)

Speculative decoding helps when: (1) the workload is memory-bandwidth-bound (batch size 1 or small batch) -- the target model one verification pass over K+1 tokens is nearly the same memory bandwidth cost as one token pass; (2) the draft model is at least 10x smaller than the target model; (3) the generation task has predictable patterns (code, structured data).

Speculative decoding hurts when: (1) serving at large batch sizes where the target model is already compute-bound -- adding draft model overhead and longer target passes reduces throughput; (2) the task is highly unpredictable (creative writing, high temperature sampling) where acceptance rates drop below 0.5.

> [!WARNING] Speculative decoding is a latency optimization for interactive serving at low batch sizes. It trades throughput for latency. At high batch sizes where throughput is the priority, it is counterproductive.`,

    quickFire: [
      { q: 'What is the key insight behind speculative decoding?', a: 'A fast draft model generates K tokens speculatively; the large target model verifies all K+1 positions in one parallel forward pass. If accepted, K tokens are produced for the cost of one target pass.' },
      { q: 'Is speculative decoding lossless?', a: 'Yes. The acceptance/rejection sampling procedure guarantees the output distribution is identical to the target model running without speculation.' },
      { q: 'What is acceptance rate (alpha) and how does it affect speedup?', a: 'Fraction of draft tokens accepted. Expected accepted tokens per run = alpha*(1-alpha^K)/(1-alpha). At alpha=0.8, K=4: ~3.4 tokens/run. Speedup scales with expected accepted length.' },
      { q: 'How does Medusa differ from standard speculative decoding?', a: 'Medusa adds multiple prediction heads to the target model itself (no separate draft model). Heads predict future tokens from the same forward pass hidden states, verified with a tree attention mask.' },
      { q: 'When does speculative decoding hurt performance?', a: 'At large batch sizes where the target model is compute-bound. Adding draft overhead and longer verification passes reduces throughput per GPU without latency benefit.' },
      { q: 'What is EAGLE improvement over standard speculative decoding?', a: 'Trains a draft model that predicts target model feature embeddings rather than tokens directly, achieving higher acceptance rates (0.85-0.90) because it operates in the same representation space.' },
      { q: 'What is tree attention in speculative decoding?', a: 'A structured attention mask that allows the target model to verify multiple draft token paths simultaneously in one forward pass, increasing the number of candidates without requiring multiple passes.' },
      { q: 'How does temperature affect speculative decoding acceptance rates?', a: 'High temperature increases randomness in the target distribution. More random outputs are less predictable by the draft model, lowering acceptance rates and reducing speculative decoding benefit.' },
    ],

    keyQuestions: [
      {
        question: 'Explain the speculative sampling acceptance procedure and prove it produces the correct distribution.',
        answer: `The goal is to produce a sequence from the target model distribution p(x | context) while using the draft model distribution q(x | context) to generate candidates in parallel.

The procedure for each draft token x_i at position i:
1. Generate x_i from q(x | context_i) (draft model, fast)
2. In the target model verification pass, compute p(x_i | context_i)
3. Accept x_i with probability min(1, p(x_i) / q(x_i))
4. If rejected, sample a new token from the adjusted distribution:
   p_prime(x) = max(0, p(x) - q(x)) / sum_x max(0, p(x) - q(x))
   This corrected distribution ensures the marginal distribution of the final token is exactly p.

Proof sketch: The final accepted token at position i has distribution:
- With probability min(q(x), p(x)), we accept draft token x
- With remaining probability we draw from p_prime(x) = (p(x) - min(p(x),q(x))) / Z where Z is the normalizer
- Total probability of outputting token x = min(q(x),p(x)) + Z * p_prime(x)
  = min(q(x),p(x)) + p(x) - min(p(x),q(x)) = p(x)

Therefore the marginal distribution over the final token is exactly p(x) regardless of the draft model distribution q. This holds token-by-token, so the joint distribution over the sequence matches the target model exactly. The draft model quality only affects acceptance rate (efficiency), not correctness.

\`\`\`python
import torch

def speculative_sample(target_logits, draft_logits, draft_tokens):
    """
    target_logits: [K+1, vocab] from target model verification pass
    draft_logits: [K, vocab] from draft model
    draft_tokens: [K] the draft token ids
    Returns: accepted tokens + one corrected token
    """
    K = len(draft_tokens)
    accepted = []
    for i in range(K):
        p = torch.softmax(target_logits[i], dim=-1)
        q = torch.softmax(draft_logits[i], dim=-1)
        x = draft_tokens[i]
        accept_prob = min(1.0, (p[x] / q[x]).item())
        if torch.rand(1).item() < accept_prob:
            accepted.append(x)
        else:
            # Sample from adjusted distribution p' = max(0, p-q) / Z
            adjusted = torch.clamp(p - q, min=0)
            adjusted = adjusted / adjusted.sum()
            corrected = torch.multinomial(adjusted, 1)
            return accepted + [corrected.item()]
    # All K accepted: sample normally from target at position K
    final = torch.multinomial(torch.softmax(target_logits[K], dim=-1), 1)
    return accepted + [final.item()]
\`\`\``,
      },
    ],

    visualizations: [
      {
        title: 'Speculative Decoding: Draft-Verify Pattern and Speedup Analysis',
        description: `Speculative decoding algorithm, Medusa architecture, and when to use it.

Standard speculative decoding flow:
1. Draft model generates K tokens: [x1, x2, x3, x4] (fast, small model)
2. Target model: one forward pass over [prompt, x1, x2, x3, x4]
   -> computes p_target at positions 0,1,2,3,4 simultaneously
3. For each draft token xi: accept with prob min(1, p_target(xi)/p_draft(xi))
4. On first rejection at position j: sample corrected token from adjusted p_target
5. Net result: j accepted tokens + 1 corrected token = j+1 tokens per target pass

Speedup formula:
- Expected tokens per target pass E[accepted] = alpha*(1-alpha^K)/(1-alpha) + 1
- With K=5, alpha=0.8: E[tokens] = 0.8*(1-0.8^5)/0.2 + 1 = 3.69 tokens
- With draft model taking 5% of target compute: speedup = 3.69 / 1.05 = ~3.5x

Medusa architecture:
- Standard transformer layers (frozen)
- Medusa head 1 (FFN) -> predict token t+1 from hidden state at t
- Medusa head 2 (FFN) -> predict token t+2
- Medusa heads 3-5 -> predict tokens t+3, t+4, t+5
- Verification: tree attention over all head predictions simultaneously
- No separate model, ~5-10% param overhead, 2-3x speedup at batch=1

When to apply speculative decoding:
- Batch size 1-4: highly memory-bound decode -> 2-4x speedup typical
- Batch size 8-16: diminishing returns as GPU becomes less memory-bound
- Batch size > 32: usually hurts throughput, use standard continuous batching

Acceptance rate benchmarks (LLaMA-3 70B, temperature=0):
- Standard draft (LLaMA-3 8B): ~0.70-0.75 on code generation
- Medusa-3: ~0.75-0.80
- EAGLE-2: ~0.85-0.90
- Lookahead decoding (no draft model): ~0.65-0.70`,
        image: '/diagrams/ai-perf/speculative-decoding.png',
      },
    ],
  },

  // ─── 8. Quantization & Model Compression ─────────────────────────────────
  {
    id: 'quantization-model-compression',
    title: 'Quantization & Model Compression',
    icon: 'layers',
    color: '#f59e0b',
    questions: 10,
    description: 'FP8, INT8, INT4, and FP4 quantization. Post-training quantization (PTQ) vs quantization-aware training (QAT). GPTQ, AWQ, SmoothQuant, and the NVIDIA Transformer Engine.',
    introduction: `Quantization reduces the numerical precision of model weights (and optionally activations) from 32-bit or 16-bit floating point to lower-bit representations. The primary benefits are memory reduction (a model that fits in GPU memory at FP16 may fit 2x more at INT8 or 4x more at INT4), bandwidth reduction (fewer bytes to read per weight during memory-bound decode), and compute throughput (lower-precision tensor cores have higher peak FLOPS). The primary risk is accuracy degradation -- lower precision introduces quantization error that can compound through model layers.

## Data Types and Their Properties

FP32 (float32): 8 exponent bits, 23 mantissa bits. Standard precision for optimizer states and loss scaling. Not used for inference.

BF16 (bfloat16): 8 exponent bits, 7 mantissa bits. Same dynamic range as FP32, lower precision than FP16. The standard training and inference precision for LLMs due to robustness to overflow. H100 BF16 tensor core throughput: 1979 TFLOPS.

FP16 (float16): 5 exponent bits, 10 mantissa bits. Higher precision than BF16 but narrower dynamic range (max ~65504). Common in older models. Requires loss scaling in training.

FP8 (e4m3 and e5m2): 4 exponent bits + 3 mantissa bits (e4m3, used for weights and activations in forward pass) or 5 exponent bits + 2 mantissa bits (e5m2, used for gradients due to wider range). Hopper natively computes FP8 tensor operations at 2x the throughput of BF16. FP8 is the production standard for H100 inference in 2025-2026.

INT8: 8-bit signed integer. Requires a scale factor per-tensor or per-channel. Used for W8A16 (weights INT8, activations FP16) or W8A8. SmoothQuant is the standard technique for W8A8 LLM quantization.

INT4/FP4: 4-bit integer or float. Blackwell natively supports FP4 at 2x INT8 throughput. Used for weight-only quantization (W4A16) to maximize memory savings while keeping activations in FP16. GPTQ and AWQ are the standard PTQ algorithms for W4A16.

## Post-Training Quantization (PTQ) Algorithms

PTQ quantizes a model after training is complete, using a small calibration dataset (100-512 samples) to determine quantization parameters without retraining.

GPTQ (Frantar et al., 2022): layer-wise quantization using second-order Hessian information. For each layer, GPTQ minimizes the L2 reconstruction error of the quantized weight output (W * X - W_q * X)^2 using the Fisher information matrix estimated from calibration data. It updates unquantized weights to compensate for the error from already-quantized weights, column by column. GPTQ achieves high accuracy at INT4 (perplexity within 0.5-1.0 of FP16 for LLaMA-3 70B) in ~hours of CPU computation.

AWQ (Lin et al., 2023): Activation-aware Weight Quantization. Observes that weight channels corresponding to high-activation inputs contribute disproportionately to the final loss when quantized. AWQ searches for a per-channel scale factor that scales these salient channels up before quantization (so they have higher effective precision) and scales the preceding activation down by the same factor (preserving the mathematical operation).

SmoothQuant (Xiao et al., 2022): addresses the challenge of W8A8 quantization where activations have large outliers that are hard to quantize. SmoothQuant migrates quantization difficulty from activations to weights using a mathematically equivalent transformation: scale activations by 1/s and weights by s for each channel, choosing s to equalize the quantization challenge. After smoothing, both activations and weights are easily quantizable to INT8 with low error.

## NVIDIA Transformer Engine

The Transformer Engine (TE) is NVIDIA library for FP8 training and inference on Hopper/Blackwell. TE automatically selects between FP8 and BF16 for each layer based on the operation type and applies per-tensor calibration (history-based amax tracking). For inference, TE uses FP8 for GEMM (doubling tensor core throughput) with BF16 for residuals and activations where precision matters more. Production deployment with TE + FP8 achieves 1.7-1.9x throughput vs BF16 on H100.

## Structured Sparsity

NVIDIA A100/H100 support 2:4 structured sparsity: for every 4 consecutive values in a weight matrix, at most 2 are non-zero. The sparse matrix is compressed to half the memory, and a bitmask records which values are non-zero. The tensor core implements 2:4 sparse GEMM at 2x the dense GEMM throughput. Combined with FP8, this enables 4x the FP16 dense throughput. The tradeoff: 2:4 sparsity requires sparse-aware fine-tuning or SparseGPT for post-training application.`,

    quickFire: [
      { q: 'What is W4A16 quantization?', a: 'Weights are quantized to INT4 or FP4; activations remain in FP16. Maximum memory reduction (4x vs FP16), modest compute benefit. Standard for memory-constrained deployment of large models.' },
      { q: 'What is W8A8 quantization?', a: 'Both weights and activations are INT8. Achieves 2x memory reduction AND higher INT8 tensor core throughput vs FP16. Requires activation quantization (harder due to outliers). SmoothQuant makes this practical.' },
      { q: 'What does GPTQ stand for and what makes it accurate?', a: 'Generative Pre-trained Transformer Quantization. Uses second-order Hessian information (Fisher matrix) to minimize layer-wise reconstruction error, compensating later unquantized weights for error introduced by earlier quantized ones.' },
      { q: 'What is the key insight of AWQ?', a: 'Some weight channels matter much more than others (correspond to high-activation inputs). AWQ scales those salient channels up before INT4 quantization (giving them higher effective precision) and compensates in the activation path.' },
      { q: 'Why are activation outliers a problem for INT8 quantization?', a: 'A per-tensor INT8 scale is set by the maximum value. One large outlier forces all other values into a tiny fraction of the 256 quantization levels, destroying precision for normal activations.' },
      { q: 'What is SmoothQuant key transformation?', a: 'Migrates quantization difficulty from activations to weights via: activation / s, weight * s (per-channel). Choosing s to equalize outlier magnitude between activations and weights enables accurate W8A8.' },
      { q: 'What throughput does FP8 achieve on H100 vs BF16?', a: 'H100 FP8 tensor throughput: ~3958 TFLOPS vs 1979 TFLOPS BF16 -- exactly 2x. With calibration overhead, production inference sees 1.7-1.9x speedup.' },
      { q: 'What is 2:4 structured sparsity?', a: 'For every 4 consecutive weights, exactly 2 are non-zero. Hardware-enforced at 2x throughput over dense. Combined with FP8 gives 4x throughput over FP16 dense.' },
      { q: 'What is QAT vs PTQ?', a: 'PTQ quantizes after training using calibration data. QAT simulates quantization noise during training, allowing gradients to adapt. QAT achieves higher accuracy at very low bit widths (INT4) but requires retraining.' },
      { q: 'What is per-channel vs per-tensor quantization?', a: 'Per-tensor uses one scale for the entire weight matrix; per-channel uses one scale per output channel. Per-channel is more accurate. Per-group quantization (one scale per 128 weights) is a middle ground used in GPTQ/AWQ.' },
    ],

    keyQuestions: [
      {
        question: 'Compare GPTQ and AWQ for deploying a LLaMA-3 70B model in INT4. Which would you choose and why?',
        answer: `Both GPTQ and AWQ target W4A16 quantization for LLMs: weights at INT4, activations at FP16/BF16. The choice depends on hardware, serving framework, and accuracy requirements.

GPTQ quantizes each layer independently using a closed-form second-order optimization. For each layer with weights W and calibration activations X, it minimizes ||WX - W_q X||_F^2 where W_q is the quantized version, using the Hessian H = XX^T. The update rule processes columns of W sequentially, adjusting remaining unquantized columns to compensate for already-quantized ones (OBQ: Optimal Brain Quantization). Calibration time: 3-8 hours on CPU for a 70B model (parallelizable across layers). Output accuracy on LLaMA-3 70B: perplexity within 0.3-0.5 points of FP16 at INT4 per-group-128.

AWQ uses a search-based approach: for each layer, find a per-channel scale s* that minimizes the quantization error of a subset of salient weight channels. The search is fast (minutes) and the transformation is equivalent: it pre-scales the weight before quantization and post-scales the activation. AWQ accuracy on LLaMA-3 70B: comparable to GPTQ, sometimes slightly better on downstream tasks because it directly optimizes for the activation magnitude distribution.

For deployment: AWQ is better supported in the current (2025-2026) ecosystem. The AutoAWQ library produces models that are natively supported by vLLM, TensorRT-LLM, and llama.cpp with minimal configuration. The actual inference kernel (ExllamaV2, CUDA-optimized INT4 GEMM with dequantization fused) performs identically between GPTQ and AWQ quantized models.

> [!TIP] My choice: AWQ for most production deployments because of faster quantization time, equivalent accuracy, and better tooling integration. Use GPTQ when maximum accuracy at INT4 is critical (coding or math tasks where small perplexity differences matter) and you have time for the longer calibration process. Use FP8 instead of INT4 when you have H100/Blackwell GPUs and the model fits in FP8 (2x the BF16 throughput with lower accuracy risk than INT4).`,
      },
    ],

    visualizations: [
      {
        title: 'Quantization Data Types, Algorithms, and Throughput Tradeoffs',
        description: `Quantization options, algorithms, and hardware throughput map.

Data type memory and throughput:
Format    | Bits | Memory vs FP16 | H100 TFLOPS | Notes
FP32  |  32  | 2x larger      | 67          | Optimizer states only
BF16  |  16  | 1x (baseline)  | 1979    | Training + inference default
FP16  |  16  | 1x             | 1979        | Legacy, prone to overflow
FP8 e4m3 |  8 | 0.5x          | 3958    | Inference GEMM, Hopper+
INT8  |   8  | 0.5x           | 3958        | W8A8 with SmoothQuant
INT4  |   4  | 0.25x          | ~7900*      | W4A16, GPTQ/AWQ
FP4   |   4  | 0.25x          | ~7900*      | Blackwell native
*INT4/FP4 throughput gain limited by dequantization overhead; effective ~4x BF16

Quantization scheme comparison:
- W16A16 (BF16): baseline accuracy, baseline speed, 16 bytes/param
- W8A16: -0.1% accuracy, 1.5-2x bandwidth, 8 bytes/param
- W8A8 (SmoothQuant): -0.3% accuracy, 2x compute+BW, 8 bytes/param
- W4A16 (GPTQ/AWQ): -0.5-1% accuracy, 3-4x bandwidth, 4 bytes/param
- W4A8: -1-2% accuracy, 4-6x bandwidth, 4 bytes/param

GPTQ algorithm steps:
1. Compute Hessian H = X * X^T for each layer (512 calibration samples)
2. For each column q of W (left to right):
   a. Quantize column q: w_q = round(w / scale) * scale
   b. Update remaining columns to compensate:
      W[q+1:] -= (w - w_q) * H^-1[q+1:, q] / H[q,q]
3. Store quantized weights + per-group-128 scales

AWQ algorithm steps:
1. For each input channel j: compute salience = mean(|activation_j|)
2. Find per-channel scale: s_j = salience_j^alpha (alpha typically 0.5)
3. Transform: W_scaled[i,j] = W[i,j] * s_j, x_scaled = x / s_j
4. Quantize W_scaled to INT4 (uniform magnitude after scaling)
5. At inference: W_scaled_q * x_scaled approximates W * x`,
        image: '/diagrams/ai-perf/quantization-model-compression.png',
      },
    ],
  },

  // ─── 9. MoE Inference Optimization ───────────────────────────────────────
  {
    id: 'moe-inference-optimization',
    title: 'Mixture of Experts (MoE) Inference',
    icon: 'network',
    color: '#10b981',
    questions: 8,
    description: 'MoE architecture, top-K expert routing, expert parallelism, load balancing, all-to-all communication, and DeepSeek MoE optimization patterns for efficient inference at scale.',
    introduction: `Mixture of Experts (MoE) models replace the dense feed-forward network (FFN) in each transformer layer with a set of N expert FFNs, activating only a small subset (typically top-2) for each token. This allows model capacity (parameter count) to scale without proportionally scaling compute: a 16-expert MoE model with the same hidden dimension as a dense model has ~8x the parameters but processes each token through only 2 experts, so inference compute per token is similar to the dense model while parameter capacity is much higher. DeepSeek-V3 (671B parameters, 37B active per token) and Mixtral 8x7B/8x22B are the prominent examples.

## MoE Architecture

Each MoE layer contains: a router (a learned linear layer + softmax/topK) that produces a routing score over N experts for each token, and N expert FFN networks (typically 2-4 layer MLPs). For top-2 routing, each token selects its top-2 experts by routing score, computes through both, and combines their outputs weighted by the routing scores. The expert FFNs share the same architecture but have independent weights.

The total parameter count is N * expert_params + router_params + all other model components. For DeepSeek-V3: 671B total, 37B active per token (the remaining parameters are in experts that are not selected for a given token).

## Expert Parallelism

In a large MoE model, all experts cannot fit on one GPU. Expert Parallelism (EP) distributes experts across GPUs: each GPU holds N/EP_size experts. When a token is routed to expert i, which may be on GPU j, the token hidden state must be sent to GPU j for computation.

The communication pattern is an All-to-All: each GPU needs to send to every other GPU the hidden states of tokens that are routed to that GPU experts. All-to-All is the most expensive collective operation for large EP groups because each GPU sends and receives from every other GPU simultaneously.

> [!WARNING] All-to-All communication volume scales as O(batch_size * hidden_dim * EP_size). With EP=64 GPUs, a single All-to-All can transfer tens of gigabytes per MoE layer. Minimizing All-to-All volume via expert grouping and locality-aware scheduling is critical for MoE inference throughput.

## Load Imbalance

The router learns to route tokens to the most useful experts for each token type. In practice, some experts become consistently popular, creating load imbalance: some GPUs process many more tokens per step than others. The total step time is determined by the busiest GPU, so imbalance directly reduces throughput.

Mitigation strategies: (1) Auxiliary load balancing loss during training -- adds a loss term that encourages uniform expert utilization; (2) Expert capacity factors -- cap the number of tokens any single expert can process per step; excess tokens are dropped or sent to a shared expert; (3) Dynamic load-aware routing at inference -- online rebalancing of routing probabilities based on current load.

## DeepSeek MoE Innovations

DeepSeek-V2 and V3 introduce several MoE optimizations. Fine-grained expert segmentation uses more experts of smaller size rather than fewer large experts, reducing per-expert compute and improving routing granularity. Shared experts (a subset of experts always active for every token) ensure a baseline FFN quality while routed experts handle specialized content. Expert grouping schedules token-expert assignments in a way that minimizes All-to-All communication volume by keeping tokens on their GPU when possible. DeepSeek MLA (Multi-head Latent Attention) compresses the KV cache by projecting K/V through low-rank matrices before caching, reducing KV cache size by ~4x.

## Inference Framework Support

vLLM supports Fused MoE kernels that combine the routing, expert dispatch, and expert computation into a single GPU kernel, avoiding intermediate materialization of per-expert input batches. The key optimization is that for decode (batch size 1-small), many experts receive zero tokens per step -- the fused kernel skips these experts entirely, avoiding wasted computation on empty expert batches.`,

    quickFire: [
      { q: 'What is top-2 routing in MoE?', a: 'Each token is processed by exactly the 2 experts with the highest routing scores (from the learned router linear layer). Outputs are combined weighted by softmax routing scores.' },
      { q: 'Why does MoE have more parameters but similar inference compute?', a: 'Parameter count scales with N_experts * expert_size, but compute scales with top_K * expert_size. Top-K is fixed (e.g., 2) regardless of N (e.g., 64), so adding more experts increases capacity without proportional compute.' },
      { q: 'What collective operation does expert parallelism require?', a: 'All-to-All: each GPU sends hidden states of tokens routed to other GPUs experts, and receives hidden states for tokens routed to its own experts. Both send and receive involve all EP_size GPUs.' },
      { q: 'Why is load balancing critical in MoE?', a: 'Imbalanced routing makes some experts process far more tokens than others. Step time is bounded by the busiest expert/GPU. Load imbalance directly reduces throughput and increases latency.' },
      { q: 'What is the auxiliary load balancing loss?', a: 'A training-time loss term that encourages uniform expert selection frequency, penalizing routing distributions where some experts are consistently over-used. Tradeoff: conflicts with task objective.' },
      { q: 'What is DeepSeek MLA?', a: 'Multi-head Latent Attention: compresses K/V into a low-rank latent vector before caching. Reduces KV cache size ~4x vs standard MHA at minimal quality cost.' },
      { q: 'What is an expert capacity factor?', a: 'A cap on how many tokens an expert can process per step. Tokens exceeding the cap are dropped or sent to a shared overflow expert, bounding the maximum per-step load on any expert.' },
      { q: 'How does fused MoE kernel avoid wasted computation?', a: 'Skips expert computations when the expert receives zero tokens in that step (common during decode at small batch sizes). Avoids launching empty GEMM operations that would still incur kernel launch overhead.' },
    ],

    keyQuestions: [
      {
        question: 'How would you serve DeepSeek-V3 (671B params, 37B active) efficiently on a multi-node H100 cluster?',
        answer: `DeepSeek-V3 has 671B total parameters with 37B active per token. At BF16 (2 bytes/param), full model weights = 1.34 TB. This does not fit on a single 8xH100 node (640 GB total HBM). We need a multi-node deployment with quantization.

Option: FP8 quantization + multi-node tensor parallelism. Apply FP8 to weights (halving weight bytes to ~670 GB) and use 2 DGX nodes (16x H100 = 1.28 TB available HBM). With TP=8 within each node and PP=2 across 2 nodes, each GPU holds 671B / (8*2) = 42B parameters worth of weights. At FP8, that is 42 GB per GPU -- fits in 80 GB with 38 GB left for KV cache and activations. Communication: TP AllReduce within node over NVLink (fast), pipeline stage activation transfer across nodes over InfiniBand.

Expert parallelism for MoE layers: with EP=16 (one expert group per GPU), each GPU holds 256/16 = 16 routed experts per MoE layer. All-to-All for token dispatch over NVLink within each 8-GPU node and InfiniBand across nodes. For the 61 MoE layers in DeepSeek-V3, the all-to-all communication is the critical path per layer.

KV cache with MLA: DeepSeek-V3 uses Multi-head Latent Attention which compresses KV cache to ~4x smaller than standard MHA. For 4096 tokens, KV cache per request drops significantly, allowing more concurrent requests within the remaining HBM budget.

For production serving, the recommended approach is disaggregated P/D: a dedicated prefill cluster (compute-bound, larger TP degree) and a dedicated decode cluster (memory-bound, PagedAttention + continuous batching + CUDA Graphs). The prefill cluster runs each request forward pass once to generate the KV cache, transfers the KV to the decode cluster over NVLink or InfiniBand, and the decode cluster handles continuous token generation.

> [!TIP] Sizing: for 100 requests/sec with avg 2048-token prompts and 512-token responses, roughly 8-12 prefill nodes and 4-6 decode nodes provide adequate throughput with sub-500ms TTFT and sub-50ms TPOT, depending on hardware efficiency.`,
      },
    ],

    visualizations: [
      {
        title: 'MoE Architecture, Routing, and Expert Parallelism',
        description: `MoE model structure, routing mechanism, and distributed deployment.

MoE layer structure (per transformer layer):
Input hidden states [batch, seq, hidden_dim]
   -> Router linear: [hidden_dim, N_experts] -> softmax -> top-K scores + indices
   -> For each token: dispatch to top-K experts
   -> Expert i: FFN_i(x) = W2_i * GELU(W1_i * x)  (independent per expert)
   -> Weighted sum of top-K expert outputs
   -> Output [batch, seq, hidden_dim]

DeepSeek-V3 specifics:
- 671B total parameters, 37B active per token
- 61 MoE layers, 3 dense layers (first 3 layers)
- 256 routed experts + 1 shared expert per MoE layer
- Top-8 routing (8 of 256 experts per token)
- Hidden dim: 7168, each expert FFN: 7168 * 2048 (fine-grained, smaller experts)

Expert Parallelism (EP) communication steps:
1. Token assignment: router scores computed locally
2. All-to-All dispatch: send token hidden states to remote expert GPUs
3. Expert computation: each GPU runs its local experts on received tokens
4. All-to-All gather: return expert outputs to originating GPUs
5. Weighted combine: sum top-K expert outputs weighted by routing scores

Load balance metrics:
- Ideal: each expert receives batch_size * top_K / N_experts tokens
- Actual: follows learned routing -> some experts 3-5x more popular
- Impact: GPU with busiest expert determines step latency
- Balance loss coefficient: 0.001-0.01 (tune to minimize imbalance without quality loss)

Inference optimizations:
- Fused MoE CUDA kernel: dispatch + expert GEMM + combine in single kernel
- Skip zero-token experts: no GEMM for experts with empty batch (common at batch=1)
- Expert affinity caching: schedule on decode workers co-located with those experts
- Quantize expert weights: experts are the largest memory component; INT4 reduces memory 2.5-3x`,
        image: '/diagrams/ai-perf/moe-inference-optimization.png',
      },
    ],
  },

  // ─── 10. PyTorch torch.compile & FSDP ────────────────────────────────────
  {
    id: 'pytorch-compile-fsdp',
    title: 'PyTorch torch.compile, FSDP2 & Training Optimization',
    icon: 'settings',
    color: '#f59e0b',
    questions: 10,
    description: 'torch.compile internals (TorchDynamo, TorchInductor), FSDP2 sharding strategies, activation checkpointing, mixed-precision training, and the PyTorch profiler workflow for training throughput optimization.',
    introduction: `PyTorch is the dominant framework for large model training in 2025-2026. High training throughput requires understanding the compiler stack (torch.compile), memory management (FSDP2, activation checkpointing), and numerical precision (mixed-precision, loss scaling). Together, these techniques determine whether a training job achieves 60% or 40% of theoretical hardware peak.

## torch.compile

torch.compile (PyTorch 2.0+) is a JIT compiler that transforms Python-level PyTorch code into optimized native code. It has three components in the compilation pipeline:

TorchDynamo: a Python bytecode capture engine. It intercepts Python execution at the bytecode level and extracts the graph of tensor operations, handling arbitrary Python control flow by detecting graph breaks (Python operations that cannot be traced, like data-dependent if statements, Python print calls, or calling external libraries). On a graph break, TorchDynamo falls back to Python execution. Minimizing graph breaks is critical for compilation performance.

AOT Autograd: converts the captured forward graph into a joint forward-backward graph. This allows the backward pass to be optimized by the backend compiler, enabling fusions across forward and backward operations that are impossible at the Python eager level.

TorchInductor: the default backend code generator. It maps the graph IR to either OpenAI Triton (GPU) or C++/OpenMP (CPU) code, applying loop tiling, pointwise fusion (fusing elementwise operations into a single kernel), and persistent reduction optimization. TorchInductor auto-tunes kernel parameters using Triton autotuner.

The practical impact of torch.compile: on LLM training, compile achieves 1.2-1.5x speedup over eager mode by fusing operations (eliminating separate kernel launches for RMSNorm, RoPE embedding, residual additions), reducing memory bandwidth requirements, and removing Python interpreter overhead.

## Activation Checkpointing

During backpropagation, PyTorch retains all intermediate activations from the forward pass in memory to compute gradients. For a transformer with L layers, batch size B, sequence length S, and hidden dimension H, activation memory grows as O(L * B * S * H). For LLaMA-3 70B training with L=80, B=4, S=4096, H=8192: ~21 GB of activation memory, before accounting for attention maps.

Activation checkpointing (gradient checkpointing) discards activations after the forward pass and recomputes them during the backward pass by re-running the forward pass for each checkpointed segment. The memory reduction is ~10-15x (only O(sqrt(L)) checkpoints needed for O(sqrt(L)) memory at the cost of 30-35% extra compute). Selective checkpointing (checkpointing only the most memory-intensive operations like attention) achieves most of the memory benefit with less compute overhead.

## Mixed Precision Training

Mixed precision (BF16 for forward/backward pass, FP32 for optimizer states) is the standard for LLM training. The workflow: model weights are stored in BF16, activations and gradients are computed in BF16 (using tensor cores), and the optimizer maintains FP32 master weights plus FP32 momentum and variance. The final gradient update is applied to FP32 master weights then cast to BF16 for the next forward pass.

FP8 training (via NVIDIA Transformer Engine) extends this to use FP8 for GEMM operations in the forward and backward pass, with BF16 for residuals, normalizations, and the optimizer. FP8 training reduces memory ~25% vs BF16 mixed precision and provides 2x tensor core throughput for GEMM. Accuracy is maintained through per-tensor history-based scaling (amax tracking over a sliding window).

## FSDP2 with Async Prefetch

FSDP2 key optimization over FSDP1 is async layer prefetching. During the forward pass, when layer L is computing, FSDP2 initiates the AllGather for layer L+1 weights on a separate NCCL stream. By the time layer L finishes, layer L+1 weights are available without waiting. Similarly in the backward pass, the ReduceScatter for layer L gradients is issued while layer L-1 backward compute runs. In well-tuned configurations, communication is almost entirely hidden behind compute, approaching the theoretical compute-bound ceiling.

FSDP2 sharding strategies: FULL_SHARD (ZeRO-3, shards parameters + gradients + optimizer state, minimum memory, maximum communication), SHARD_GRAD_OP (ZeRO-2, shards only gradients + optimizer, less communication), HYBRID_SHARD (ZeRO-3 within a node, full replica across nodes -- reduces inter-node communication at cost of more intra-node memory). HYBRID_SHARD is preferred for multi-node training where inter-node bandwidth (InfiniBand) is the bottleneck.

## PyTorch Profiler Workflow

The PyTorch Profiler captures CPU and GPU activity with kernel-level granularity. The Chrome trace shows the sequence of CUDA kernels, their durations, and CPU-GPU synchronization. Key patterns to diagnose: GPU idle gaps (launch overhead or CPU bottleneck), very short kernels (poor batching, consider fusing), and long non-fused kernel sequences (compile opportunity).

> [!TIP] The profiler schedule \`wait/warmup/active\` pattern avoids first-step JIT compilation noise: skip N steps (\`wait\`), then warmup for M steps, then capture K active steps. This gives a clean trace of steady-state behavior.`,

    quickFire: [
      { q: 'What are the three components of torch.compile?', a: 'TorchDynamo (bytecode capture and graph extraction), AOT Autograd (joint forward-backward graph), TorchInductor (code generation to Triton/C++ with kernel fusion and autotuning).' },
      { q: 'What is a graph break in TorchDynamo?', a: 'A Python operation that cannot be traced (data-dependent control flow, external library call, print). TorchDynamo falls back to eager execution, losing optimization opportunity across the break.' },
      { q: 'What does activation checkpointing trade?', a: 'Trades compute for memory: discards activations during forward pass, recomputes them during backward pass. ~30-35% extra forward compute saves ~10-15x activation memory.' },
      { q: 'What is BF16 mixed precision training?', a: 'Forward/backward in BF16 (using tensor cores), FP32 master weights and optimizer states (for precision in parameter updates). Standard for LLM training.' },
      { q: 'What is FSDP FULL_SHARD equivalent to?', a: 'ZeRO-3: shards model parameters, gradients, and optimizer states across all data-parallel workers. Minimum memory per GPU, maximum AllGather/ReduceScatter communication.' },
      { q: 'What does FSDP2 async prefetch do?', a: 'While layer L computes, FSDP2 asynchronously AllGathers layer L+1 weights on a separate NCCL stream. By the time L finishes, L+1 weights are ready, hiding AllGather latency behind compute.' },
      { q: 'What is HYBRID_SHARD in FSDP2?', a: 'ZeRO-3 within each node (full sharding with NVLink) but full model replica across nodes (no inter-node sharding). Reduces expensive InfiniBand AllGathers at cost of more intra-node communication.' },
      { q: 'How does TorchInductor fuse operations?', a: 'By analyzing the computation graph and identifying sequences of pointwise operations (ReLU, addition, normalization) that can be fused into a single Triton kernel, eliminating intermediate HBM reads/writes.' },
      { q: 'What is loss scaling in FP16 training?', a: 'FP16 has a small dynamic range (max ~65504). Small gradients underflow to zero. Loss scaling multiplies the loss by a large factor (2^16), scaling gradients up before the FP16 backward pass, then divides after.' },
      { q: 'What is the PyTorch Profiler schedule wait/warmup/active pattern?', a: '\`wait=N\` skips first N steps (no overhead), \`warmup=M\` warms up profiler for M steps, \`active=K\` profiles K steps. Avoids the first-step JIT compilation noise and limits trace size.' },
    ],

    keyQuestions: [
      {
        question: 'How would you use torch.compile to speed up LLM training and what are the failure modes to watch for?',
        answer: `Applying torch.compile to LLM training is a high-leverage optimization but requires understanding the compilation model to avoid performance regressions.

The basic application is straightforward:

\`\`\`python
model = LLaMA3(config)
model = torch.compile(model, mode="max-autotune")
\`\`\`

The \`mode\` parameter controls the compilation-speed tradeoff: \`"reduce-overhead"\` reduces kernel launch overhead with minimal compilation time; \`"default"\` enables most fusions; \`"max-autotune"\` runs TorchInductor autotuner to find optimal kernel tile sizes (slowest compilation, best runtime performance, 5-15 minute compilation for a 7B model).

The most important optimization torch.compile provides for LLMs is fusion of elementwise operations. RMSNorm (compute rms, divide, multiply by scale), RoPE embedding (complex multiplication, rotate positions), and residual additions are all elementwise or reduction operations that, in eager mode, each launch separate CUDA kernels that round-trip through HBM. torch.compile fuses these into single Triton kernels, reducing HBM bandwidth consumption by 3-5x for these operations. The FlashAttention kernel is already manually fused and not re-compiled by TorchInductor; it is registered as an opaque function.

Failure modes to watch for:

Graph breaks: the most common problem. Call \`torch._dynamo.explain(model)(input)\` to identify graph breaks before deployment. Common causes: (1) using Python data structures (lists, dicts) inside the forward pass with variable length; (2) calling \`torch.where\` or scatter with indices computed from tensor values; (3) printing inside the model; (4) using non-torch functions. Fix by rewriting the offending code in a fully traceable form.

Recompilation for dynamic shapes: by default, TorchDynamo recompiles the graph when input shapes change (different batch sizes, different sequence lengths). Fix: pass \`dynamic=True\` to torch.compile, which generates shape-generic Triton code. Alternatively, bucket input lengths and compile a separate graph per bucket.

Numerical differences: compilation may reorder operations or change accumulation order, causing small numerical differences from eager mode. These are generally within acceptable ranges for training but should be validated against a reference run.

> [!TIP] FSDP2 + torch.compile: FSDP2 is officially supported via \`torch.compile(model, fullgraph=True)\`. The AllGather operations appear as nodes in the compiled graph, enabling the compiler to fuse the post-AllGather operations with the subsequent GEMM.`,
      },
      {
        question: 'What is the complete optimization checklist for maximum GPU MFU on LLaMA-3 70B training?',
        answer: `A systematic checklist organized from highest-impact to lower-impact optimizations, with the goal of maximizing Model FLOP Utilization (MFU -- actual training throughput as a fraction of theoretical hardware peak).

1. Mixed precision (BF16): Ensure the model uses \`torch.autocast("cuda", dtype=torch.bfloat16)\` for all forward/backward pass operations.

\`\`\`python
with torch.autocast("cuda", dtype=torch.bfloat16):
    output = model(input_ids)
    loss = criterion(output, targets)
loss.backward()
\`\`\`

2. FSDP2 with FULL_SHARD and async prefetch: configure FSDP2 with \`prefetch_factor=2\` and verify in Nsight Systems that AllGather operations are overlapping with compute kernels.

3. Activation checkpointing with selective policy: use selective checkpointing on attention and FFN layers (the memory-heavy ops) while allowing cheaper operations to retain their activations.

\`\`\`python
from torch.distributed.algorithms._checkpoint.checkpoint_wrapper import (
    apply_activation_checkpointing, CheckpointWrapper
)
check_fn = lambda submodule: isinstance(submodule, TransformerBlock)
apply_activation_checkpointing(model, checkpoint_wrapper_fn=CheckpointWrapper, check_fn=check_fn)
\`\`\`

4. torch.compile with max-autotune: accept the 5-15 minute warmup cost for the 1.3-1.5x training speedup. Use \`TORCH_COMPILE_DEBUG=1\` to identify graph breaks and eliminate them.

5. Data pipeline optimization: ensure DataLoader workers are saturating the GPU. Profile with Nsight Systems -- gaps where the GPU is waiting for the CPU to provide the next batch indicate a data pipeline bottleneck. Use \`num_workers >= 4*num_gpus\`, \`pin_memory=True\`, \`persistent_workers=True\`.

6. Fused Adam optimizer: use \`torch.optim.Adam(fused=True)\` which runs a single CUDA kernel for all parameter updates vs one kernel per parameter.

7. Communication tuning: set NCCL environment variables (\`NCCL_NSOCKS_PERTHREAD=4\`, \`NCCL_MIN_NCHANNELS=4\`, \`NCCL_TOPO_FILE\` to point to server NVLink topology file).

8. Monitor MFU: compute expected FLOPs per step = 6 * N_params * seq_len * batch_size. Divide by (measured_step_time * N_GPUs * peak_TFLOPS). A well-optimized 70B training run achieves 40-50% MFU on H100. Lower values indicate the above optimizations are needed.`,
      },
    ],

    visualizations: [
      {
        title: 'torch.compile Pipeline and Training Optimization Stack',
        description: `torch.compile compilation pipeline and LLM training optimization checklist.

torch.compile compilation flow:
Python model code
   -> TorchDynamo: bytecode capture, graph extraction
      Identifies graph breaks (fallback to eager at those points)
      Outputs FX graph (ATen-level IR)
   -> AOT Autograd: joint forward-backward graph
      Enables cross-forward-backward kernel fusion
      Outputs joint FX graph
   -> TorchInductor: code generation
      Fuses pointwise ops (RMSNorm, RoPE, residuals into single Triton kernel)
      Generates optimized Triton or C++ kernels
      Autotunes tile sizes (max-autotune mode)
   -> Compiled kernels: cached and replayed on future calls

Typical speedup from torch.compile on LLM training:
- RMSNorm fusion: 1.8x speedup for that op (2 HBM passes -> 1)
- RoPE fusion: 1.5x (multiple small ops merged)
- Overall model: 1.2-1.5x end-to-end

Mixed precision training memory layout:
- Model weights: BF16 (2 bytes/param)
- Activations: BF16 (2 bytes/elem)
- Gradients: BF16 (2 bytes/param)
- Optimizer states: FP32 (4+4+4 = 12 bytes/param for Adam: master params + m + v)
- Total per param: 2 + 2 + 12 = 16 bytes
- 70B model: 70B * 16 = 1120 GB (requires ~14 H100 80GB just for weights+optimizer)

FSDP2 memory reduction (70B, 16 GPUs FULL_SHARD):
- Without FSDP: 1120 GB / 16 = 70 GB per GPU (just fits in 80 GB, no room for activations)
- With FSDP2 FULL_SHARD: model_shard = 1120 GB / 16 = 4.4 GB base
  Plus working layer (AllGathered): ~2-5 GB
  Peak per GPU: ~20-25 GB (excellent fit in 80 GB with room for batch size > 1)

Activation checkpointing tradeoff:
- Without checkpointing: O(L * B * S * H) activation memory
  70B (80 layers, batch=4, seq=4096, hidden=8192): ~21 GB
- With full checkpointing: ~2-3 GB activations
- Compute overhead: ~33% (one extra forward pass equivalent)

MFU target for LLaMA-3 70B on H100:
- Peak TFLOPS per GPU: 1979 (BF16 tensor)
- Expected FLOPs per step: 6 * 70B * 4096 * batch = 6 * 70e9 * 4096 * batch
- Typical MFU with all optimizations applied: 40-50%
- Common bottlenecks causing low MFU: data pipeline stalls, communication not overlapped, graph breaks`,
        image: '/diagrams/ai-perf/pytorch-compile-fsdp.png',
      },
    ],
  },

];
