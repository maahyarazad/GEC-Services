# Feature Ticket 1: Partner Delivery Info Step in Onboarding Wizard

## Description
Add a new step to the Partner Onboarding Wizard as the **3rd step**.
Partners cannot proceed to the submission step until this step is completed.

## Requirements
At this step, the partner must provide the following information:

| # | Field | Required |
|---|-------|----------|
| 1 | Delivery Address | ✅ |
| 2 | Contact Person | ✅ |
| 3 | Phone Number | ✅ |

## Validation Rules
- All fields are mandatory
- Partner cannot advance to the next step without completing all required fields

---

# Feature Ticket 2: Employee Status Management in Partner Onboarding

## Description
Enhance the Partner Onboarding process to allow HR to manage employee status.
This is an enhancement on top of `feature_2.md` — all existing functionality must be preserved.

## Requirements
HR must be able to perform the following actions on employee records:

| Action | Description |
|--------|-------------|
| **ADD** | Add a new employee record |
| **UPDATE** | Modify an existing employee record |
| **DELETE** | Remove an employee record |

## Scope
- **Frontend:** Add UI controls for ADD / UPDATE / DELETE actions
- **Backend:** Implement the corresponding API logic for each action

## Dependencies
- Builds on top of `feature_2.md` — review and extend existing logic accordingly