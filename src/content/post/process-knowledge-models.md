---
publishDate: 2026-10-20T00:00:00Z
title: 'Process Knowledge Models: teaching an AI agent what a chamber is'
excerpt: An agent that reasons over a structured, versioned description of your process outperforms a larger model that is guessing.
image: ~/assets/images/knowledge-graph.svg
category: AI × Semiconductor
tags:
  - knowledge-model
  - ontology
  - agentic-ai
author: JD Nayak
---

A general-purpose language model knows the word "chamber". It does not know your chamber: which tool type it belongs to, which parameters matter, what the limits are, or which chambers it should match. A Process Knowledge Model (PKM) fixes that.

## What a PKM is

A PKM is a structured, versioned description of the process and equipment, written in a readable format such as YAML. It captures processes, equipment, parameters, limits and the relationships between them. The agent reasons over it instead of guessing.

## Why structure beats prompt text

- **Versioned.** You can diff it, review it and roll it back like code.
- **Testable.** You can check a PKM against real data and flag contradictions.
- **Shared.** Several agents use the same facts, so they agree with each other.
- **Auditable.** When an agent explains a decision, it can point at the model entries it used.

## Connecting to open ontologies

A PKM is more valuable when it aligns with open semiconductor ontologies, including the Digital Reference ontology from the ECSEL and Infineon-led work. Alignment makes knowledge shareable and queryable across applications. For storage I have evaluated GraphDB, Apache Jena Fuseki and Oxigraph, and I keep the schema (TBox) separate from the instance data (ABox) so each can evolve on its own schedule.

## Capturing knowledge without freezing it

The hard part is not the format. It is getting tribal expertise out of engineers' heads without freezing it in place. The answer is to treat the PKM as a living artefact: engineers review changes, agents propose them, and every change is versioned.

Teach the agent the fab first. A bigger model can come later.
