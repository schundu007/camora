#!/usr/bin/env python3
"""
Diagram Engine — generates cloud architecture diagrams using mingrammer/diagrams.

Uses Claude API to generate Python code for the diagrams library,
then executes it to produce a PNG image.

Usage:
  python3 diagram_engine.py --question "Design a URL shortener" \
    --provider auto --detail-level overview --output-dir /tmp/diagrams \
    --api-key sk-ant-...
"""

import argparse
import json
import os
import sys
import subprocess
import tempfile
import uuid
import traceback

try:
    import anthropic
except ImportError:
    # Install anthropic if not available
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'anthropic', '-q'])
    import anthropic


def get_diagram_prompt(question, provider, detail_level, direction):
    """Build the Claude prompt for generating diagrams code."""
    provider_import = {
        'aws': 'aws',
        'gcp': 'gcp',
        'azure': 'azure',
    }.get(provider, 'aws')  # default to AWS

    detail_instruction = (
        "Create a SIMPLE diagram with 5-8 nodes showing only the main components."
        if detail_level == 'overview'
        else "Create a DETAILED diagram with 10-15 nodes showing all major components including caches, queues, monitoring, and databases."
    )

    return f"""Generate Python code using the `diagrams` library (mingrammer/diagrams) to create a cloud architecture diagram.

SYSTEM DESIGN: {question}

REQUIREMENTS:
- {detail_instruction}
- Use {provider_import.upper()} cloud provider icons
- Graph direction: {"LR (left to right)" if direction == "LR" else "TB (top to bottom)"}
- Output format: PNG
- The diagram MUST be saved to the path specified by the OUTPUT_PATH environment variable
- Use `diagrams.Diagram` with `filename=os.environ["OUTPUT_PATH"]` and `show=False`
- Do NOT include the .png extension in filename — the library adds it automatically

IMPORTANT RULES:
- Only use imports from `diagrams`, `diagrams.{provider_import}.*`
- Use `diagrams.{provider_import}.compute`, `diagrams.{provider_import}.database`, `diagrams.{provider_import}.network`, `diagrams.{provider_import}.storage`, `diagrams.{provider_import}.integration` etc.
- For generic nodes use `diagrams.generic.compute`, `diagrams.generic.database`, `diagrams.generic.network`
- Group related components using `diagrams.Cluster`
- Use >> operator for connections: `node1 >> node2`
- Use << operator for reverse: `node1 << node2`
- Use - operator for bidirectional: `node1 - node2`
- Each node variable name must be unique
- Do NOT call plt.show() or any matplotlib functions

Return ONLY the Python code, no explanation, no markdown fences."""


def generate_diagram(question, provider, detail_level, direction, output_dir, api_key):
    """Generate a diagram using Claude + diagrams library."""
    client = anthropic.Anthropic(api_key=api_key)

    # Generate diagram code with Claude
    prompt = get_diagram_prompt(question, provider, detail_level, direction)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    code = response.content[0].text.strip()

    # Clean up code — remove markdown fences if present
    if code.startswith("```"):
        lines = code.split("\n")
        code = "\n".join(lines[1:])  # Remove first line (```python)
    if code.endswith("```"):
        code = code[:-3].strip()

    # Generate unique filename
    diagram_id = str(uuid.uuid4())[:8]
    output_path = os.path.join(output_dir, f"diagram-{diagram_id}")

    # Write code to temp file and execute
    code_file = os.path.join(tempfile.gettempdir(), f"diagram_code_{diagram_id}.py")
    try:
        with open(code_file, 'w') as f:
            f.write(code)

        env = os.environ.copy()
        env['OUTPUT_PATH'] = output_path

        result = subprocess.run(
            [sys.executable, code_file],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=output_dir,
            env=env,
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Diagram code execution failed: {result.stderr[:500]}",
                "python_code": code,
            }

        # The diagrams library appends .png automatically
        image_path = output_path + ".png"
        if not os.path.exists(image_path):
            # Try without extension (some versions don't append)
            if os.path.exists(output_path):
                image_path = output_path
            else:
                return {
                    "success": False,
                    "error": "Diagram was generated but image file not found",
                    "python_code": code,
                }

        return {
            "success": True,
            "image_path": image_path,
            "python_code": code,
            "cloud_provider": provider,
            "detail_level": detail_level,
        }

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Diagram generation timed out (60s)"}
    except Exception as e:
        return {"success": False, "error": str(e), "python_code": code}
    finally:
        # Cleanup temp code file
        try:
            os.unlink(code_file)
        except OSError:
            pass


def main():
    parser = argparse.ArgumentParser(description='Generate cloud architecture diagrams')
    parser.add_argument('--question', required=True, help='System design question')
    parser.add_argument('--provider', default='auto', help='Cloud provider (aws/gcp/azure/auto)')
    parser.add_argument('--difficulty', default='medium')
    parser.add_argument('--category', default='System Design')
    parser.add_argument('--format', default='png')
    parser.add_argument('--output-dir', required=True, help='Output directory for diagrams')
    parser.add_argument('--api-key', required=True, help='Anthropic API key')
    parser.add_argument('--detail-level', default='overview', help='overview or detailed')
    parser.add_argument('--direction', default='LR', help='LR or TB')

    args = parser.parse_args()

    # Ensure output dir exists
    os.makedirs(args.output_dir, exist_ok=True)

    # Map 'auto' provider to 'aws' (most common)
    provider = args.provider if args.provider != 'auto' else 'aws'

    try:
        result = generate_diagram(
            question=args.question,
            provider=provider,
            detail_level=args.detail_level,
            direction=args.direction,
            output_dir=args.output_dir,
            api_key=args.api_key,
        )
        # Output JSON to stdout for the Node.js wrapper
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
