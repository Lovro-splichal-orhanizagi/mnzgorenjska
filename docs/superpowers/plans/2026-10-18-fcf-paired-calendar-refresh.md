# FCF Paired Calendar Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkboxes.

**Goal:** Recover exactly the observed opposite-direction pending fixture pair from mixed cached source metadata.
**Architecture:** Normal FCF block load identifies one narrow same-round pending pair, refreshes only reused cached members once and validates source identity/coherent distinct rounds before returning. Existing transport/cache pipeline remains.
**Tech Stack:** Existing JavaScript/Node22 node:test; no dependencies.
**Spec:** docs/superpowers/specs/2026-10-18-fcf-paired-calendar-refresh-design.md

## Global Constraints
- Atmost2logicalcachedmemberrefetches, no repeats ofinitialproviderfresh pages or recursion; native transport/pacing/refusalrules unchanged.
- No invented fixtures, results/players/minutes, DB/API keys or pricing/position/activation override.
- Narrow FCF source/test/authentictrimmedheaders/testwiring/docs only. Existing7audits/sharedtransport/DFB unchanged.
- Rootalone ownsactualsource operations after reviews/CI/deploy; primarycounterpartcurrentround isnotknown yet.

## Review Focus
- Fresh source contradiction must not triggerretry: bothfresh/onefresh tests.
- Wrongacta/group/season/opponent mustnotreplace cachedbody: focusedidentity mutation tests.
- Unresolved/multiple anomalies stop afterfinitebudget: exactcallcount/clearerror tests.
- Source refusal/timeout/unknown mustnotprogresssecondmember/fallback: transportstubtests.
- Healthy/otherFCFcanonicalbehavior remainsidentical: existingfixture/apps comparisons andsmoke.

### Task 1: Guarded paired cache recovery

**Files:** Modify scripts/viri/fcf.mjs, package.json, docs/viri/spanija.md; create scripts/test-fcf-calendar.mjs and up to3header-onlyderivatives scripts/vzorci/es-fcf-calendar-*.html.
**Interfaces:** preberiBlok(koda,prenesi,options) and beri remainpublic/privatecontractscompatible; returnedblock/normalpostave/apps shapeunchanged.

- [ ] Step1: Readspec, relevantCLAUDE/source docs and recovered G4raw/manifest. Buildprivacytrimmedauthenticheader fixtures withaccuratecacheprovenance; syntheticnewR5counterpart explicitlytestonly. Writefocusedtests forallreviewfocus/spec rules withnetworkforbidden.
- [ ] Step2: RunfocusedRED beforeproductedit; realrecordedassertionmustshowtwooppositedirectionsinR20 currentlyreturnwithouttargetedrefresh.
- [ ] Step3: Addminimalnarrowpairdetection, cachedreused-IDbookkeeping andsequentialboundedrefetch through existingtransport; validatesourceroute/headeridentity beforecachewrite and targetedpairdistinct-roundcoherence beforeblockreturn. Preserveotherblocksemantics/interfaces.
- [ ] Step4: RunfocusedGREEN; existingFCFtransport/cachetests andcanonical/app comparison. Wiretest:sources andbriefsource-docnote. Runone npmrun smoke withNode22 andCI fakepublicenv; recordcounts/warnings. No DB-writing npmtest.
- [ ] Step5: Selfreview, task-onlycommit andfullreport at suppliedSDDreportpath withRED/GREEN, actualcallbounds/provenance/unchangedfiles andresidualsourceuncertainty. No nestedagents/remoteoperations.
