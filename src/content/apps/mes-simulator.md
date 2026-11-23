---
title: Fab MES Simulator
summary: A full-screen manufacturing execution system for a simulated 300 mm fab. Track lots, dispatch work, run tools, react to SPC and read wafer maps as an operator, technician, process engineer, yield engineer or shift manager.
type: mes
status: live
order: 2
standalone: true
image: ~/assets/images/fab-flow-light.svg
tags: [MES, Lot tracking, Equipment, SPC, Yield, Simulation]
---

The **Fab MES Simulator** is a working manufacturing execution system for **FAB-1**, a fictional 300 mm fab. Lots move through re-entrant logic and power routes, tools fail and get repaired, metrology steps feed SPC charts, and probe turns tool wear into die yield and wafer maps. All of it runs live in your browser.

Pick a persona in the top bar and the app changes with you. An **operator** loads the next lot onto their tools. A **technician** answers alarms and runs PMs. A **process engineer** dispositions holds and releases inhibited tools. A **yield engineer** traces a low-yield excursion back to the tool that caused it. A **shift manager** watches WIP, moves and due dates. Each persona can only do what that role can do in a real fab.
