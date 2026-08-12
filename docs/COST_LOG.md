# 成本仪表盘 — contracts-sdk

| 日期 | Sprint | 任务 | 调用次数 | Input Tokens | Output Tokens | 费用(USD) | 累计(USD) |
|------|--------|------|---------|-------------|--------------|----------|----------|
| 2026-08-12 | aiken-enhance | Claude 一审（6 项问题） | 3 | 697,231 | 42,233 | ~1.81 | 1.81 |
| 2026-08-12 | aiken-enhance | Claude 二审（5✅1⚠️） | 3 | 113,203 | 46,062 | ~0.94 | 2.75 |
| 2026-08-12 | aiken-enhance | Codex 修复（4 项） | 1 | ~32K | ~8K | ~0.10 | 2.85 |
| 2026-08-12 | aiken-enhance | Claude 三审（✅可合入） | 2 | 191,588 | 26,375 | ~0.94 | 3.79 |

> 注：Claude Code 费用按各 -p/--continue 调用 CLI 报告 total_cost_usd 估算（DeepSeek V4，cache_read 未单列费用，实际更低）；Codex 按会话 token 估算。token 数取自会话 JSONL usage（input 含缓存前缀重读）。
