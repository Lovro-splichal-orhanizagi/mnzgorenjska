import {FCF_SIX_PROTOCOL,validateFcfSixContinuationPlan} from './fcf-six-continuation-plan.mjs'
// Explicit source-plan union; the legacy validator itself remains unchanged.
import {validateFcfMissingInventoryPlan} from './fcf-missing-inventory-plan.mjs'
import {FCF_G9_HELD_PARENT_PROTOCOL,validateFcfG9HeldParentPlan} from './fcf-g9-held-parent-plan.mjs'
import {isFcfFutureSourceProtocol,validateFcfFutureSourcePlan} from './fcf-future-source-plan.mjs'
export const isFcfG9HeldParentPlan=plan=>plan?.preset===FCF_G9_HELD_PARENT_PROTOCOL
export const isFcfSixPlan=plan=>plan?.preset===FCF_SIX_PROTOCOL
export const isFcfFutureSourcePlan=plan=>isFcfFutureSourceProtocol(plan?.preset)
export const isFcfIndependentSourcePlan=plan=>isFcfG9HeldParentPlan(plan)||isFcfSixPlan(plan)||isFcfFutureSourcePlan(plan)
export function validateFcfInventorySourcePlan(input){return isFcfFutureSourcePlan(input?.plan)?[validateFcfFutureSourcePlan(input)]:isFcfSixPlan(input?.plan)?validateFcfSixContinuationPlan(input):isFcfG9HeldParentPlan(input?.plan)?[validateFcfG9HeldParentPlan(input)]:validateFcfMissingInventoryPlan(input)}
export const fcfInventorySeedBinding=plan=>isFcfIndependentSourcePlan(plan)?null:plan.seedBinding
