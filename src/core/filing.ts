import { FilingStatus, UserRole } from '../types';

export class InvalidFilingTransitionError extends Error {
  constructor(
    public currentStatus: FilingStatus,
    public targetStatus: FilingStatus,
    public userRole: UserRole,
    message?: string
  ) {
    super(
      message ||
        `Illegal filing transition from ${currentStatus} to ${targetStatus} attempted by role ${userRole}.`
    );
    this.name = 'InvalidFilingTransitionError';
  }
}

/**
 * State machine rules:
 * DRAFT -> UNDER_REVIEW (Owner, Accountant, Admin)
 * UNDER_REVIEW -> UNDER_REVIEW (Accountant, Owner - corrections)
 * UNDER_REVIEW -> DRAFT (Owner or Accountant - retract)
 * UNDER_REVIEW -> READY_TO_FILE (Accountant or Owner after review)
 * READY_TO_FILE -> UNDER_REVIEW (If records or data change, resets to under review)
 * READY_TO_FILE -> FILED (Owner, Accountant, Admin)
 * FILED -> terminal state, no further transitions allowed!
 */
export function can_transition(
  current: FilingStatus,
  target: FilingStatus,
  role: UserRole
): { allowed: boolean; reason?: string } {
  // FILED is final
  if (current === 'FILED') {
    return {
      allowed: false,
      reason: 'Filing has already been marked as FILED. The record is permanently locked.',
    };
  }

  // DRAFT transitions
  if (current === 'DRAFT') {
    if (target === 'UNDER_REVIEW') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'A draft filing must first be submitted for review before it can be marked ready to file or filed.',
    };
  }

  // UNDER_REVIEW transitions
  if (current === 'UNDER_REVIEW') {
    if (target === 'UNDER_REVIEW') {
      // Re-trigger review after correction
      return { allowed: true };
    }
    if (target === 'DRAFT') {
      return { allowed: true };
    }
    if (target === 'READY_TO_FILE') {
      if (role === 'ACCOUNTANT' || role === 'OWNER' || role === 'ADMIN') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Only an Accountant or Business Owner can certify records as Ready to File.',
      };
    }
    if (target === 'FILED') {
      return {
        allowed: false,
        reason: 'Records in Under Review cannot directly skip to Filed without being certified as Ready to File.',
      };
    }
  }

  // READY_TO_FILE transitions
  if (current === 'READY_TO_FILE') {
    if (target === 'UNDER_REVIEW') {
      // Data changed or accountant requested re-check
      return { allowed: true };
    }
    if (target === 'FILED') {
      return { allowed: true };
    }
    if (target === 'DRAFT') {
      return {
        allowed: false,
        reason: 'Ready to File filings can only move to Filed or back to Under Review.',
      };
    }
  }

  return {
    allowed: false,
    reason: `Unsupported transition from ${current} to ${target}.`,
  };
}

export function execute_transition(
  current: FilingStatus,
  target: FilingStatus,
  role: UserRole
): FilingStatus {
  const check = can_transition(current, target, role);
  if (!check.allowed) {
    throw new InvalidFilingTransitionError(current, target, role, check.reason);
  }
  return target;
}
