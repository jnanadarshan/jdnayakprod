---
publishDate: 2026-11-02T00:00:00Z
title: 'Why virtual metrology is the right first agentic AI use case for a fab'
excerpt: Virtual metrology has the data, the feedback loop and the bounded blast radius that a first agentic AI deployment needs.
image: ~/assets/images/wafer-metrology.svg
category: AI × Semiconductor
tags:
  - virtual-metrology
  - agentic-ai
  - semiconductor
author: JD Nayak
---

When a fab asks where to start with agentic AI, my answer is usually virtual metrology (VM). It is not the flashiest use case. It is the one with the best odds of working, and of teaching the organisation how to run agents safely.

## The data already exists

VM predicts a metrology outcome, such as film thickness or CD, from process and sensor data collected during the run. Fabs already hold years of paired data: trace data on one side, measured results on the other. That gives you labelled history without a new data collection programme.

## The feedback loop is short and measurable

Every time a wafer is actually measured, you learn whether the prediction was right. That makes evaluation concrete. You can track error, drift and calibration continuously, which is exactly the evidence an agent needs to earn more autonomy.

## The blast radius is bounded

An advise-only VM agent that flags low-confidence predictions cannot scrap a lot. The first stage of autonomy is also the safest: the agent explains, the engineer decides. As confidence data accumulates, you can move to recommending reduced sampling with approval, and later to acting inside defined limits.

## Uncertainty is part of the product

A VM number without an uncertainty estimate is a liability. Ensemble models with conformal prediction give calibrated intervals, so the agent knows when to say "measure this one". That behaviour, knowing when it does not know, is the foundation of every later agent in the fab.

## It builds the reusable pattern

The knowledge model, orchestration graph and human-in-the-loop gates you build for VM transfer directly to defect analysis, FDC and chamber matching. One governed pattern, reused, is worth more than a clever one-off.

If you are choosing a first use case, pick the one where you can measure whether the agent was right. For most fabs, that is virtual metrology.
