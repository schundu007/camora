/**
 * Control-plane track diagrams (cp-*), rewritten from the graphviz originals
 * in scripts/gen-controlplane-diagrams.py.
 *
 * The originals failed for one reason: every node held a whole paragraph, so
 * graphviz produced a tall column of text-walls at 12pt with no visual
 * hierarchy — the reader has to *read* the diagram rather than *see* it.
 *
 * The rewrite keeps the same information but gives it structure:
 *   • a bold, numbered stage title on its own line, so the spine is scannable
 *   • detail as short middot-separated fragments, not sentences
 *   • side commentary moved into labelled subgraphs beside the spine rather
 *     than dangling off a dotted edge with no explanation
 *   • the spine reads top-to-bottom, context reads left-to-right
 */
import { CLASS_DEFS } from '../render-mermaid.mjs';

export const diagrams = [
  {
    id: 'cp-7-bare-metal',
    category: 'devops',
    title: 'Bare metal — from a racked machine to a cluster node',
    definition: `flowchart TB
  rack["<b>A machine arrives</b><br/>no OS · no agent · powered off"]
  oob["<b>1 · OUT-OF-BAND MANAGEMENT</b><br/>BMC on its own network<br/>IPMI (legacy) · Redfish (REST)<br/>power · boot device · virtual media · sensors<br/><i>the only way in before an OS exists</i>"]
  boot["<b>2 · NETWORK BOOT CHAIN</b><br/>DHCP offers opt 66 (server) + 67 (bootfile)<br/>TFTP loads a small NBP → iPXE chainloads<br/>HTTP fetches the real kernel<br/><i>UEFI HTTP Boot skips TFTP entirely</i>"]
  insp["<b>3 · INSPECTION / DISCOVERY</b><br/>boot a ramdisk, enumerate the truth<br/>CPU · RAM · NICs + MACs · disks · GPUs · firmware<br/><i>inventory is discovered, not typed into a spreadsheet</i>"]
  rack --> oob --> boot --> insp
  img["<b>4 · IMAGE THE DISK</b><br/>prebuilt image — fast, deterministic<br/>or an installer — kickstart · preseed · autoinstall<br/><i>image-based wins for fleets</i>"]
  cfg["<b>5 · CONFIGURE</b><br/>cloud-init / Ignition for first boot, Ansible for the rest<br/>BIOS + firmware settings are configuration — version them<br/><i>GPU nodes: SR-IOV · above-4G decoding · IOMMU · power profile</i>"]
  join["<b>6 · JOIN THE CLUSTER</b><br/>kubeadm · Cluster API + Metal³"]
  img --> cfg --> join
  tools["<b>THE TOOL LANDSCAPE</b><br/>OpenStack Ironic — the mature engine<br/>Canonical MAAS — full lifecycle + UI<br/>Tinkerbell — CNCF, workflow-based<br/>Metal³ — bridges Ironic to Cluster API, so bare metal becomes a Machine"]
  real["<b>WHAT IS DIFFERENT FROM CLOUD</b><br/>you cannot autoscale what is not racked<br/>lead time is WEEKS, not seconds<br/>failures are physical — a node that will not POST, a bad DIMM,<br/>a NIC that renamed itself, thermal throttling<br/>capacity planning becomes procurement<br/><i>always-on cost, so utilisation is the metric that matters</i>"]

  insp ==> img
  insp -.-> tools
  join -.-> real

  class rack gray
  class oob slate
  class boot navy
  class insp cyan
  class img purple
  class cfg teal
  class join green
  class tools gold
  class real red
  ${CLASS_DEFS}
`,
  },
];
