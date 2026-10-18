// Explicit source-plan union; the legacy validator itself remains unchanged.
import {validateFcfMissingInventoryPlan} from './fcf-missing-inventory-plan.mjs'
import {FCF_G9_HELD_PARENT_PROTOCOL,validateFcfG9HeldParentPlan} from './fcf-g9-held-parent-plan.mjs'
export const isFcfG9HeldParentPlan=plan=>plan?.preset===FCF_G9_HELD_PARENT_PROTOCOL
export function validateFcfInventorySourcePlan(input){return isFcfG9HeldParentPlan(input?.plan)?[validateFcfG9HeldParentPlan(input)]:validateFcfMissingInventoryPlan(input)}
export const fcfInventorySeedBinding=plan=>isFcfG9HeldParentPlan(plan)?null:plan.seedBinding
