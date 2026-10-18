# Exact Calonge pair implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the two unsupported Calonge intervals with the explicit club-primary75-minute pair.

**Architecture:** One fixed helper guards full raw SHA and the entire ordinary canonical report before changing two switches and attaching provenance. The FCF parser calls it before returning a report; existing appearance derivation handles the resulting real intervals.

**Tech Stack:** Existing Node ESM parser and node:test, no dependencies.

**Spec:** docs/superpowers/specs/2026-10-18-fcf-calonge-pair-design.md

## Global constraints

- Exact acta4116202 only, FCF31287135/48680949, home bench/starter,75/75; preserve goal87 and Edgar13.
- Fail closed on changed raw SHA, canonical report or transport/source identity; preserve all other reports.
- No production/Actions/activation/pricing operations; root reviews and owns rollout.
- Public fixtures exclude officials, venue, staff and unrelated data; raw source remains private.

## Review focus

- Changed source bytes must stop correction before canonical data can persist.
- Duplicate/other-side identities must never choose a player by shirt or substring.
- Corrected output must preserve every unrelated source event and appearance.
- Provenance must distinguish full capture SHA from trimmed fixture SHA.
- TerceraG2 remains held independently by4116215.

### Task1: Fixed source-bound pair

Files: create scripts/viri/fcf-calonge-pair.mjs, scripts/test-fcf-calonge-pair.mjs, scripts/vzorci/es-fcf-calonge-4116202.html and provenance text; modify scripts/viri/fcf.mjs, package.json and docs/viri/spanija.md.

- [x] Extract authentic relevant RSC fixture and verify its parsed ordinary canonical equality with full source.
- [x] Write regression for literal75/75 and exact unchanged remainder; run RED against no correction.
- [x] Implement fixed helper plus parser call; validate hash/route/id/url/roles/uniqueness/canonical fingerprint before mutation.
- [x] Add fail-closed controls and unrelated-report comparison; run GREEN and private full-source integration.
- [x] Run source tests and smoke, inspect diff and commit isolated patch for root independent review.

Validation:21 focused tests;642 source tests; full npm run smoke (local placeholder client configuration, no database); actual full-source491934-byte integration confirms two interval changes,33 other appearances and all four original goal clocks unchanged, and all six other fresh reports unchanged. Initial smoke required missing local VITE client settings; rerun with localhost/public placeholder passed. Root independent review remains outstanding.
