# Catalonia Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate every already-imported eligibleCatalangroup whosecompleteproductiondatapassesguardedreadiness.
**Architecture:** NewnarrowActionsonlytwo-phaseactivationusingexistingstate/readiness/paginationhelpers andexistingserviceRPC. Stableapprovalmanifestbindsvalidatedstate; existingimportcoordinatorserializesESwrites. No schema/scoring/source/pricingchange.
**Tech Stack:** NodeESmodules,existingSupabaseclient/RPC,GitHubActions.
**Spec:** docs/superpowers/specs/2026-10-17-catalonia-live-design.md

## Global Constraints
- Exactly27configuredFCFuppergroups; ES/sourcefcf/currentseason; Quarta,FAS,Novanet excluded.
- UserconfirmedFCFpermissionreceived2026-10-17; recordtruthinexistingSpain docs. Nooutreach.
- NoSQL/RPC/schema/scoring/sourceparser/price/positionchanges,productionkeysoutsideActions orretroactivefantasy.
- Allreadiness/sourcequality/pagination/deadlinechecksmandatory; sourcependinggamesremainpending.
- ExistingRPCperformstheonlymutation,afterapprovedSHAandcurrentstateguardsandimportcoordination.

## Review Focus
- Paginationmustnottruncateappearancesat1000orlosegoals/matches.
- Samegoaltotalbutwrongbeneficiary,starter/keepercounts,unresolvedwarningoroverduematchmustblock.
- Prices/stats/deadlinechangedafterapprovalmustrefuseactivation.
- Futurefirstfantasyroundmustbeunplayedandfuture,includingRPCearlyplayedfuture-roundsemantics.
- NewactivationworkflowmustparticipateinbothsidesofESimportcoordination; noquietconcurrentwritewindow.

### Task1: Guarded Catalan activation operation
**Files:** create scripts/vklopi-katalonijo.mjs, scripts/test-vklop-katalonije.mjs, .github/workflows/vklop-katalonije.yml. Modify scripts/cakaj-na-uvoze.mjs andits existingcoordinationtests, .github/workflows/ci.yml activationteststep, docs/viri/spanija.md permission/status/procedure. Package.json onlywhenBayernwriterhasfinished. Reuse src/lib/pripravljenost.ts, scripts/strani.mjs.
**Interfaces:** exportedpurequality/manifestfunctionsfortests; CLIpreparedefaultoutputsreviewableper-leagueandbatchartifactwithoutwrites; activate requiresapprovedSHAandrepositoryActionscredentials; existingRPCvklopi_ligo_sredi_sezone andtypedreadback. Concretehelpernamesmayfollowexistingstyle.
- [ ] Write meaningfulRED tests coveringreal-shapedvalidleagueandallReviewFocusfailurecases.
- [ ] Implementcompletepaginatedsnapshot,strictquality+existingrosterreadiness,stablemanifest/SHA,Actions-onlywriteflagandpostRPCverification.
- [ ] Addworkflowdefaultpreparewithartifact,approveSHAforactivate,fixedESbatchconcurrency/olderimportcoordination. Registerfamilyandtestbothdirections.
- [ ] RunfocusedGREEN,source/coordinatorcoveringtests,typecheck/build/smokeasneeded; negativecasesmustnotcallmutatingRPC. Commitandreport.
- [ ] Independenttask/finalreviewandfullCIbeforemerge/deploy.

### Task2: Production rollout
**Files:** no productchangesexpected; exactActionsartifactsandlocaloperationledger.
**Interfaces:** prepare/activateworkflow,approvedSHA,state/readback,publiccompetitions.
- [ ] Actualreadonlyprepareeligiblegroups; inspectper-leaguequality,counts,legalrosterandfuturefirstfantasydeadline.
- [ ] Reviewexactmanifesthashforeachpassingcandidate; activatewithsamecheckedsourcecommitandSHA. Blockstaleorchangedstate,reprepareifnecessarywithnewreview.
- [ ] Verifyactiveflags,unchangedprices/positions,futurefirstfantasyround,public/esandnightlyESinclusion. Nohouseholdteams,outreachorunrelatedmutation.

Self-review: allspecguardsownedbyTask1tests; Task2onlyexistingreviewedinterfaces. Snapshot/approvalhashandcoordinatorsharedwithworkflowreviewedtogether; nohandwrittenreadinessalgorithmduplication. Useralreadyinstructsexecution/deployment,permissionconfirmed; noadditionalapprovalflow.
