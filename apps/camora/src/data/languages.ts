export interface Language {
  id: string;
  label: string;
  monaco: string;
  template?: string;
}

/* Trimmed to match the backend's actual capability surface.
   Removed entries — these were dropped from the lumora-backend
   runtime image (see codeRunner.js header comment) so the in-app
   Run button has no interpreter/compiler for them, AND they're
   uncommon enough in interview practice that listing them was
   pure clutter:
     python2, csharp, swift, kotlin, scala, r, haskell, clojure,
     elixir, erlang, fsharp, ocaml, dart, julia, objectivec,
     coffeescript, vb (Visual Basic), tcl

   Kept entries fall in three buckets:
     1. End-to-end runnable: python, javascript, typescript, java,
        c, cpp, go, rust, ruby, php, bash, perl, lua. The Run
        button works for these out of the box.
     2. Query/markup languages (sql, mysql, postgresql, html):
        generate-only — Run is a no-op but the user wants to
        practice these in interviews and the model handles them.
     3. Frameworks (react, vue, angular, svelte, nextjs, nodejs,
        django, rails, spring) and infra (terraform, kubernetes,
        docker) and Python libraries (pyspark, pytorch, tensorflow,
        scipy): generate-only — exposed because real interviews
        often phrase problems in those terms. */
export const LANGUAGES: readonly Language[] = [
  // -- Programming languages with full Run support --
  { id: 'python', label: 'Python 3', monaco: 'python', template: `class Solution:\n    def solve(self, nums, target):\n        pass` },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript', template: `function solve(nums, target) {\n    return [];\n}` },
  { id: 'typescript', label: 'TypeScript', monaco: 'typescript', template: `function solve(nums: number[], target: number): number[] {\n    return [];\n}` },
  { id: 'java', label: 'Java', monaco: 'java', template: `class Solution {\n    public int[] solve(int[] nums, int target) {\n        return new int[]{};\n    }\n}` },
  { id: 'c', label: 'C', monaco: 'c', template: `#include <stdio.h>\n#include <stdlib.h>\n\nint* solve(int* nums, int numsSize, int target, int* returnSize) {\n    *returnSize = 0;\n    return NULL;\n}` },
  { id: 'cpp', label: 'C++', monaco: 'cpp', template: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        return {};\n    }\n};` },
  { id: 'go', label: 'Go', monaco: 'go', template: `package main\n\nfunc solve(nums []int, target int) []int {\n    return nil\n}` },
  { id: 'rust', label: 'Rust', monaco: 'rust', template: `impl Solution {\n    pub fn solve(nums: Vec<i32>, target: i32) -> Vec<i32> {\n        vec![]\n    }\n}` },
  { id: 'ruby', label: 'Ruby', monaco: 'ruby', template: `def solve(nums, target)\n  []\nend` },
  { id: 'php', label: 'PHP', monaco: 'php', template: `<?php\nfunction solve($nums, $target) {\n    return [];\n}` },
  { id: 'bash', label: 'Bash', monaco: 'shell', template: `#!/bin/bash\n\n# Solution\n` },
  { id: 'perl', label: 'Perl', monaco: 'perl', template: `sub solve {\n    my ($nums, $target) = @_;\n    return ();\n}` },
  { id: 'lua', label: 'Lua', monaco: 'lua', template: `function solve(nums, target)\n    return {}\nend` },
  // -- Databases (generate-only) --
  { id: 'sql', label: 'SQL', monaco: 'sql', template: `-- Write your SQL query below\nSELECT * FROM table_name\nWHERE condition;` },
  { id: 'mysql', label: 'MySQL', monaco: 'sql', template: `-- Write your MySQL query below\nSELECT * FROM table_name\nWHERE condition;` },
  { id: 'postgresql', label: 'PostgreSQL', monaco: 'sql', template: `-- Write your PostgreSQL query below\nSELECT * FROM table_name\nWHERE condition;` },
  // -- Frameworks (generate-only) --
  { id: 'react', label: 'React', monaco: 'typescript', template: `import React from 'react';\n\nexport default function Component() {\n  return <div></div>;\n}` },
  { id: 'vue', label: 'Vue', monaco: 'html', template: `<template>\n  <div></div>\n</template>\n\n<script setup>\n</script>` },
  { id: 'angular', label: 'Angular', monaco: 'typescript', template: `import { Component } from '@angular/core';\n\n@Component({ selector: 'app-root', template: '<div></div>' })\nexport class AppComponent {}` },
  { id: 'svelte', label: 'Svelte', monaco: 'html', template: `<script>\n</script>\n\n<div></div>` },
  { id: 'nextjs', label: 'Next.js', monaco: 'typescript', template: `export default function Page() {\n  return <div></div>;\n}` },
  { id: 'html', label: 'HTML', monaco: 'html', template: `<!DOCTYPE html>\n<html>\n<head><title>Solution</title></head>\n<body>\n</body>\n</html>` },
  { id: 'nodejs', label: 'NodeJS', monaco: 'javascript', template: `function solve(nums, target) {\n    return [];\n}\n\nmodule.exports = { solve };` },
  { id: 'django', label: 'Django', monaco: 'python', template: `from django.http import JsonResponse\n\ndef solve(request):\n    pass` },
  { id: 'rails', label: 'Rails', monaco: 'ruby', template: `class SolutionController < ApplicationController\n  def solve\n  end\nend` },
  { id: 'spring', label: 'Spring', monaco: 'java', template: `@RestController\npublic class SolutionController {\n    @GetMapping("/solve")\n    public String solve() {\n        return "";\n    }\n}` },
  // -- DevOps (generate-only) --
  { id: 'terraform', label: 'Terraform', monaco: 'hcl', template: `resource "aws_instance" "example" {\n  ami           = "ami-0c55b159cbfafe1f0"\n  instance_type = "t2.micro"\n}` },
  { id: 'kubernetes', label: 'Kubernetes', monaco: 'yaml', template: `apiVersion: v1\nkind: Pod\nmetadata:\n  name: solution\nspec:\n  containers:\n  - name: app\n    image: nginx` },
  { id: 'docker', label: 'Docker', monaco: 'dockerfile', template: `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "server.js"]` },
  // -- ML / Data (generate-only) --
  { id: 'pyspark', label: 'PySpark', monaco: 'python', template: `from pyspark.sql import SparkSession\n\nspark = SparkSession.builder.appName("solution").getOrCreate()\n` },
  { id: 'pytorch', label: 'PyTorch', monaco: 'python', template: `import torch\nimport torch.nn as nn\n\nclass Model(nn.Module):\n    def __init__(self):\n        super().__init__()\n\n    def forward(self, x):\n        return x` },
  { id: 'tensorflow', label: 'TensorFlow', monaco: 'python', template: `import tensorflow as tf\n\nmodel = tf.keras.Sequential([\n])\n` },
  { id: 'scipy', label: 'SciPy', monaco: 'python', template: `import numpy as np\nfrom scipy import optimize\n\ndef solve():\n    pass` },
] as const;

export function getLanguageById(id: string): Language | undefined {
  return LANGUAGES.find((lang) => lang.id === id);
}
