"""
Regression test for prep-kit diagram IndentationError.

Real failure (production, "Design a Policy-as-Code Gated Deployment Pipeline
for Salesforce DX"): assemble_code re-indented each body line independently,
so a `with Cluster(...):` emitted at indent 0 was pushed to 4 while its
children, already at 4, stayed at 4 — collapsing the header onto its body.
All 3 LLM retries failed because the corruption happened after generation.

Run: python3 tests/test_diagram_engine_indent.py
"""
import os, sys, types

# diagram_engine imports the Gemini SDK at module scope; stub it so this test
# runs without credentials or the package installed.
if "google.genai" not in sys.modules:
    google = sys.modules.setdefault("google", types.ModuleType("google"))
    genai = types.ModuleType("google.genai")
    genai.Client = object
    google.genai = genai
    sys.modules["google.genai"] = genai

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "services"))
import diagram_engine as de

# Verbatim shape of what Gemini returned for the Salesforce DX question:
# base indent 0, with a nested cluster at 4 — valid Python as written.
RAW = '''from diagrams.aws.compute import EC2, ECS, Lambda
from diagrams.aws.management import Cloudwatch
from diagrams.aws.security import IAM
from diagrams.aws.storage import S3
from diagrams.onprem.workflow import Airflow

users = Users("Clients")

with Cluster("Salesforce DX CI/CD Pipeline"):
    pipeline_orchestrator = Airflow("CI/CD Orchestrator")
    sfdx_code_artifacts = S3("SFDX Code & Artifacts")
    sfdx_build_agent = ECS("SFDX Build Agent")
    sfdx_deployer = EC2("SFDX Deployer")
    pipeline_monitoring = Cloudwatch("Pipeline Monitoring")

    with Cluster("Policy-as-Code Enforcement Gateway"):
        policy_engine = Lambda("Policy Engine (OPA)")
        policy_rules_store = S3("Policy Rules Store")
        iam_policy_role = IAM("IAM Policy Engine Role")

    users >> Edge(label="1. Triggers Build", color="darkgreen", penwidth="2.0") >> pipeline_orchestrator
    policy_engine >> Edge(label="5. Gate Open", color="green", penwidth="2.0") >> sfdx_deployer
'''

failures = []

def check(name, cond, detail=""):
    print(("PASS  " if cond else "FAIL  ") + name + ("" if cond else "\n      " + detail))
    if not cond:
        failures.append(name)

# 1. The real regression: assembled output must be syntactically valid Python.
code = de.assemble_code(RAW, "aws", "LR")
try:
    compile(code, "<diagram>", "exec")
    check("assembled Salesforce DX diagram compiles", True)
except (IndentationError, SyntaxError) as e:
    check("assembled Salesforce DX diagram compiles", False, f"{type(e).__name__}: {e}")

# 2. Nesting must survive: the cluster header sits above its own body.
lines = [l for l in code.split("\n") if "Salesforce DX CI/CD Pipeline" in l or "CI/CD Orchestrator" in l]
hdr = next(l for l in lines if "Salesforce DX CI/CD Pipeline" in l)
child = next(l for l in lines if "CI/CD Orchestrator" in l)
hdr_i = len(hdr) - len(hdr.lstrip())
child_i = len(child) - len(child.lstrip())
check("cluster body is indented deeper than its header", child_i > hdr_i,
      f"header={hdr_i} child={child_i}")

# 3. A body already at base indent 4 must still work (the other common shape).
code4 = de.assemble_code("\n".join("    " + l if l.strip() else l for l in RAW.split("\n")), "aws", "LR")
try:
    compile(code4, "<diagram>", "exec")
    check("body arriving at base indent 4 compiles", True)
except (IndentationError, SyntaxError) as e:
    check("body arriving at base indent 4 compiles", False, f"{type(e).__name__}: {e}")

# 4. Guard the helper directly against a mixed-base block.
mixed = ['with Cluster("A"):', '    x = Foo()', '', '    with Cluster("B"):', '        y = Bar()']
norm = de._normalize_body_indent(mixed)
check("_normalize_body_indent shifts uniformly", norm[0] == '    with Cluster("A"):' and norm[1] == '        x = Foo()',
      repr(norm[:2]))

print()
if failures:
    print(f"{len(failures)} FAILED: {failures}")
    sys.exit(1)
print("all checks passed")
