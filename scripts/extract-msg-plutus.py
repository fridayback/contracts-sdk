#!/usr/bin/env python3
"""从 cardano-plutus2aiken msg-gpk-activate 分支 plutus.json 提取各 validator 的完整 compiledCode，
输出到临时文件供 SDK 侧对比/替换。"""
import json, subprocess, sys

repo = "/home/liulin/cardano/cardano-plutus2aiken"
plutus_path = "aiken/bridge/plutus.json"

content = subprocess.run(
    ["git", "show", f"msg-gpk-activate:{plutus_path}"],
    cwd=repo, capture_output=True, text=True, check=True,
).stdout
data = json.loads(content)

# title -> compiledCode（每个 validator 取 .spend/.mint/.withdraw 主条目；else 条目同 code 跳过）
out = {}
for v in data.get("validators", []):
    t = v.get("title", "")
    if "." not in t or t.endswith(".else"):
        continue
    base = t.split(".")[0]
    out.setdefault(base, v.get("compiledCode", ""))

for base, code in sorted(out.items()):
    print(f"### {base}")
    print(code[:60], "...", "len=", len(code))
