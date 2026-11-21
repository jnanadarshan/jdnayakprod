---
publishDate: 2026-10-08T00:00:00Z
title: 'Progressive autonomy: a four-stage path from advisor to actor'
excerpt: Autonomy should be earned through evidence and approvals. Here is the four-stage path I design agents around.
image: ~/assets/images/autonomy-stages.svg
category: Agentic AI
tags:
  - autonomy
  - guardrails
  - human-in-the-loop
author: JD Nayak
---

In a fab, a wrong action can scrap wafers or stop a line. That is why I never ask whether an agent should be autonomous. I ask which stage of autonomy it has earned.

## The four stages

1. **Advise.** The agent investigates and explains. Engineers decide and act.
2. **Recommend with approval.** The agent proposes a specific action. A human approves it at a defined gate.
3. **Act within bounds.** The agent acts inside explicit limits, with confidence thresholds and rollback paths.
4. **Act and report.** The agent owns a bounded task end to end. Humans supervise exceptions and set policy.

## What moves an agent up a stage

Promotion needs evidence, not enthusiasm. For each agent I define in advance:

- the metric that shows it is right, and the level it must hold
- the confidence threshold below which it must hand back to a human
- how long it must perform at that level before promotion
- who signs off

## What every stage needs

Audit trails, rollback paths and confidence thresholds are first-class design elements from day one. If you cannot undo an action, the agent should not take it at stage three.

## Humans move up the stack

This is not about removing engineers. At stage one they are operators. By stage four they are supervisors: setting policy, reviewing exceptions and improving the knowledge the agents rely on. Designing that change of role is as much part of the work as the models.
