#!/usr/bin/env python3
"""对比 cardano-plutus2aiken alpha 与 msg-gpk-activate 分支 plutus.json 的 validator 差异。
输出每个 validator 的 hash 是否变化，供 SDK 脚本同步参考。"""
import json, subprocess, sys

repo = "/home/liulin/cardano/cardano-plutus2aiken"
plutus_path = "aiken/bridge/plutus.json"

def load_plutus(rev):
    content = subprocess.run(
        ["git", "show", f"{rev}:{plutus_path}"],
        cwd=repo, capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(content)
    out = {}
    for v in data.get("validators", []):
        t = v.get("title", "")
        if not t or "." not in t:
            continue
        base = t.split(".")[0]
        # 每个 validator 取 spend/else/mint/withdraw 的合并（same code 会重复，去重）
        code = v.get("compiledCode", "")
        if base not in out:
            out[base] = (v.get("hash"), code[:80])
    return out

alpha = load_plutus("alpha")
msg = load_plutus("msg-gpk-activate")

print(f"{'validator':<28} {'alpha_hash':<40} {'msg_gpk_hash':<40} 变化")
print("-" * 115)
all_keys = sorted(set(alpha) | set(msg))
for k in all_keys:
    a = alpha.get(k)
    m = msg.get(k)
    ah = a[0] if a else "—"
    mh = m[0] if m else "—"
    changed = "CHANGED" if (a and m and a[0] != m[0]) else ("NEW" if not a else ("REMOVED" if not m else "same"))
    print(f"{k:<28} {ah:<40} {mh:<40} {changed}")
