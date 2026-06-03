# Bug Ticket: OTP Timer Issue

## Description

The `OtpTimer` component in `OTPInput` has two issues:

1. The timer does not reset when a new OTP is requested. 
2. On the registration page, the **Request OTP** button becomes disabled after requesting an OTP, which is not the intended behavior.

The server-side rate limiter is already in place and should remain enabled. Therefore, the client-side button should not be permanently disabled and should allow users to request a new OTP when appropriate.

# Bug Ticket: OTP Timer Issue – Part 2

## Description

The `OtpTimer` component in `OTPInput` has an issue:

1. The timer does not reset when a new OTP is requested. It currently works correctly only in `TemplateForm.jsx`.

Review the implementation pattern used in `TemplateForm.jsx` and apply the same pattern to all other locations where `OTPInput` is used to ensure consistent timer reset behavior.

# Bug Ticket: OTP Timer Issue – Part 3

## Description

The `OtpTimer` component in `OTPInput` is not visible in PartnerOnboarding.tsx

1. the OTPInput is nit visible in PartnerOnboarding.tsx 

Review the implementation pattern used in `MemberLogin.jsx` and apply the same pattern to PartnerOnboarding.tsx