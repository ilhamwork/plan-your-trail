# Requirements Document

## Introduction

This document defines the requirements for the **Pro Monetization** feature of PlanYourTrail.run — a Next.js 16 + Supabase web app for trail runners that analyzes GPX files.

The feature introduces a three-tier access model (Anonymous, Free Registered, Pro) with email/password + Google OAuth authentication, a Midtrans-powered subscription billing system, and a set of Pro-only capabilities gated behind an active paid subscription. Existing free features remain available to all users; previously open features (waypoints, weather, share links) are gated for Pro subscribers.

---

## Glossary

- **Anonymous_User**: A visitor who has not created an account. Results are ephemeral and lost when the tab closes.
- **Free_User**: An authenticated user with a verified or unverified email account and no active Pro subscription.
- **Pro_User**: An authenticated user with an active, paid Pro subscription.
- **Auth_System**: The Supabase Auth module responsible for user registration, login, session management, and OAuth.
- **Subscription_System**: The server-side logic that manages subscription state, billing cycles, grace periods, and tier enforcement.
- **Payment_Gateway**: The Midtrans payment integration responsible for processing subscription charges.
- **Access_Guard**: The middleware/server-side logic that enforces feature gating based on the user's current tier.
- **Rate_Limiter**: The server-side component that enforces upload frequency limits per IP (Anonymous) or per account (Free/Pro).
- **Route_Store**: The Supabase-backed storage for saved routes (GPX data, metadata, soft-delete state).
- **Share_Link**: A publicly accessible, view-only URL tied to a saved route.
- **Upgrade_Prompt**: An inline UI element (tooltip, blur overlay, or bottom sheet) that surfaces a Pro upgrade CTA.
- **Grace_Period**: A 3-day window after a payment failure during which Pro features remain accessible.
- **Soft_Delete**: A logical deletion that marks a route as deleted but retains data for 30 days before permanent removal.
- **Introductory_Price**: The one-time first-month price of Rp 29.000, non-repeatable per account lifetime.
- **Rolling_Window**: A 24-hour window calculated from the current time backwards, not a calendar-day boundary.
- **Dunning**: The process of notifying users of payment failure and prompting corrective action.

---

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a visitor, I want to create an account with email and password or Google OAuth, so that I can save my routes and access premium features.

#### Acceptance Criteria

1. WHEN a visitor submits a registration form with an email address and password, THE Auth_System SHALL create a new account, provided the password is between 8 and 128 characters and contains at least one uppercase letter, one lowercase letter, and one number.
2. WHEN a visitor initiates Google OAuth sign-in, THE Auth_System SHALL authenticate the user via Google and create or link an account without requiring a password.
3. WHEN a user registers with email and password, THE Auth_System SHALL send a verification email to the provided address within 60 seconds of successful registration.
4. WHEN a user submits a registration form with an email address already associated with an existing account, THE Auth_System SHALL return a descriptive error message indicating the email is already in use.
5. WHEN a user registers successfully, THE Auth_System SHALL allow the user to use all Free_User features immediately without requiring email verification first.
6. WHEN a user attempts to upgrade to Pro without a verified email, THE Auth_System SHALL block the upgrade and prompt the user to verify their email first.
7. WHEN a user attempts to reset their password without a verified email, THE Auth_System SHALL block the reset and prompt the user to verify their email first.
8. WHEN a registered user provides valid credentials, THE Auth_System SHALL authenticate the user and establish a session lasting 7 days.
9. WHEN a user attempts to authenticate without an existing registered account, THE Auth_System SHALL reject the attempt and direct the user to complete registration first.
10. WHEN a registered user provides invalid credentials, THE Auth_System SHALL return an error message stating that the email or password is incorrect, without specifying which field is wrong.
11. WHILE a user session is active, THE Auth_System SHALL maintain the session across page refreshes using Supabase session persistence.
12. WHEN a user explicitly signs out, THE Auth_System SHALL invalidate the session and clear all local session state.
13. WHEN a user submits 5 failed login attempts within 15 minutes, THE Auth_System SHALL lock that account from further login attempts for 15 minutes and display a message indicating the lockout duration.
14. WHEN Google OAuth authentication fails due to a provider error, THE Auth_System SHALL display an error message and return the user to an unauthenticated state without creating a partial account.
15. WHEN a user's 7-day session expires, THE Auth_System SHALL require re-authentication before granting access to authenticated features.

---

### Requirement 2: Subscription Tiers and Feature Access

**User Story:** As a product owner, I want a three-tier access model enforced server-side, so that Pro features are never accessible without a valid subscription.

#### Acceptance Criteria

1. THE Access_Guard SHALL classify every request into exactly one of three tiers: Anonymous, Free, or Pro.
2. WHILE a user's subscription is in the Active state, THE Access_Guard SHALL grant Pro tier access.
3. WHILE a user's subscription is in the Grace_Period state (up to 3 days after payment failure), THE Access_Guard SHALL grant Pro tier access.
4. WHEN the Grace_Period expires without a successful payment, THE Access_Guard SHALL downgrade the user to Free tier on the first request processed at or after the Grace_Period expiry timestamp.
5. IF a request is authenticated and the user has no active or grace-period subscription, THEN THE Access_Guard SHALL grant Free tier access.
6. IF a request is unauthenticated, THEN THE Access_Guard SHALL grant Anonymous tier access, regardless of any subscription that may exist on any account.
7. THE Access_Guard SHALL enforce tier checks on every server-side API call for features designated as Pro-only in the feature access configuration; client-side state alone SHALL NOT be sufficient to grant access.
8. IF the Access_Guard tier enforcement mechanism is unavailable or returns an indeterminate result, THEN THE Access_Guard SHALL deny all access to gated features and return a 503 response.
9. WHEN a Pro_User's subscription is cancelled, THE Access_Guard SHALL maintain Pro tier access until the first request processed at or after the current billing period_end timestamp, then downgrade to Free tier.
10. WHEN a Pro_User's subscription transitions from Active to Grace_Period, THE Access_Guard SHALL not interrupt any in-progress request that was already authorized under the Active state.

---

### Requirement 3: Pro-Only Feature Gating

**User Story:** As a Pro subscriber, I want exclusive access to advanced features, so that I get value from my subscription.

#### Acceptance Criteria

1. IF a user is not a Pro_User and attempts to invoke the waypoint add, edit, or delete API, THEN THE Access_Guard SHALL deny the request.
2. IF a user is not a Pro_User, THEN THE Access_Guard SHALL omit waypoint labels from elevation profile chart data returned by the API.
3. IF a user is not a Pro_User and attempts to invoke the weather forecast API endpoint, THEN THE Access_Guard SHALL deny the request.
4. IF a user is not a Pro_User and attempts to invoke the hourly weather forecast API endpoint, THEN THE Access_Guard SHALL deny the request; the hourly forecast is a distinct gate within the weather section and requires Pro access separately.
5. IF a user is not a Pro_User and attempts to invoke the pace and cutoff estimator API, THEN THE Access_Guard SHALL deny the request.
6. IF a user is not a Pro_User and attempts to invoke the PDF export or race brief generation API, THEN THE Access_Guard SHALL deny the request.
7. IF a user is not a Pro_User and attempts to invoke the Share_Link creation API, THEN THE Access_Guard SHALL deny the request.
8. IF a user is not a Pro_User and attempts to invoke the route comparison API, THEN THE Access_Guard SHALL deny the request.
9. IF a user is not a Pro_User and attempts to save nutrition or gear notes via the notes API, THEN THE Access_Guard SHALL deny the request.
10. IF a Free_User or Anonymous_User attempts to save a route when their saved route count already equals 3, THEN THE Route_Store SHALL deny the save operation at the API level before any data is persisted.
11. WHEN a Free_User or Anonymous_User attempts to invoke a Pro-gated API endpoint, THE Access_Guard SHALL return a 403 response without executing any part of the gated operation.
12. WHEN a non-Pro_User attempts to initiate Share_Link creation through the UI, THE Access_Guard SHALL render an Upgrade_Prompt before any Share_Link generation is attempted.

---

### Requirement 4: Upgrade Prompt and Paywall UX

**User Story:** As a Free or Anonymous user, I want to see Pro features teased — not hidden — so that I understand what I'm missing and feel motivated to upgrade.

#### Acceptance Criteria

1. IF a user is not a Pro_User and analysis results are loaded, THEN the UI SHALL render the waypoint add, edit, and delete buttons as visible but non-interactive, each with a tooltip identifying the feature as Pro-only and linking to the upgrade or pricing flow.
2. IF a user is not a Pro_User and analysis results are loaded, THEN the UI SHALL render the weather forecast section with its content blurred and an inline Upgrade_Prompt identifying the feature as Pro-only and linking to the upgrade or pricing flow.
3. IF a user is not a Pro_User and analysis results are loaded, THEN the UI SHALL render the pace estimator table with "—" in every data cell, accompanied by an Upgrade_Prompt identifying the feature as Pro-only and linking to the upgrade or pricing flow.
4. WHEN a user has not yet loaded analysis results, THE Access_Guard SHALL NOT display any Upgrade_Prompts or paywalls.
5. WHEN an Upgrade_Prompt for a specific gated feature has been dismissed by the user in the current session, THE Access_Guard SHALL NOT re-display that same feature's Upgrade_Prompt within the same session; dismissal state SHALL be stored per-feature in sessionStorage.
6. THE Access_Guard SHALL NOT display blocking modal popups for feature gates; all Upgrade_Prompts SHALL be inline elements or dismissible bottom sheets that allow the user to continue interacting with the rest of the page.

---

### Requirement 5: Route Storage and Limits

**User Story:** As a registered user, I want to save my analyzed routes, so that I can access them later without re-uploading.

#### Acceptance Criteria

1. THE Route_Store SHALL allow Free_Users to save up to 3 routes permanently.
2. THE Route_Store SHALL allow Pro_Users to save unlimited routes.
3. WHEN a Free_User attempts to save a 4th route, THE Route_Store SHALL display an Upgrade_Prompt before any save operation is attempted, blocking the save until the user upgrades or selects an alternative action.
4. WHEN a Pro_User saves a route, THE Route_Store SHALL NOT display Upgrade_Prompts.
5. WHEN a Free_User declines the upgrade prompt at the storage limit and selects a route to delete, THE Route_Store SHALL perform a Soft_Delete on the selected route and then automatically save the new route without requiring a second save action.
6. WHEN a route is deleted, THE Route_Store SHALL perform a Soft_Delete, retaining the route data for 30 days before permanent removal.
7. WHEN the 30-day retention window of a soft-deleted route expires, THE Route_Store SHALL permanently remove the route data.
8. WHEN a soft-deleted route's 30-day retention window has not expired and the owning user upgrades to Pro, THE Route_Store SHALL restore the soft-deleted route to an active state.
9. WHEN a user signs up mid-analysis session while GPX analysis results are present in the browser session, THE Route_Store SHALL attempt to persist those results as the user's first saved route; IF the auto-save fails, THEN THE Route_Store SHALL display an error message with an option to retry the save.
10. WHEN a Pro_User downgrades to Free tier, THE Route_Store SHALL mark all routes beyond the 3 most recently saved as read-only, determined by save timestamp in descending order.
11. WHEN a Pro_User downgrades to Free tier and routes are marked read-only, THE Route_Store SHALL NOT delete those routes and SHALL preserve them permanently unless explicitly deleted by the user; read-only routes may be viewed and deleted but not edited or overwritten.

---

### Requirement 6: Rate Limiting

**User Story:** As a system operator, I want upload frequency limits enforced per tier, so that the service is protected from abuse and users are incentivized to register.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL limit Anonymous_Users to 10 GPX uploads per IP address per 24-hour Rolling_Window.
2. THE Rate_Limiter SHALL limit Free_Users to 50 GPX uploads per account per 24-hour Rolling_Window.
3. THE Rate_Limiter SHALL impose no upload limit on Pro_Users.
4. THE Rate_Limiter SHALL calculate all windows as Rolling_Windows from the current timestamp, not calendar-day boundaries.
5. WHEN an Anonymous_User's upload count within the current Rolling_Window reaches 3 or 4, THE Rate_Limiter SHALL display a non-blocking nudge prompt after the upload completes successfully, without preventing the upload.
6. WHEN an Anonymous_User's upload count within the current Rolling_Window exceeds 10, THE Rate_Limiter SHALL block the upload before processing and display a message with a registration CTA; the blocked upload SHALL NOT count toward the limit.
7. WHEN a Free_User's upload count within the current Rolling_Window exceeds 50, THE Rate_Limiter SHALL block the upload before processing and display a message with a Pro upgrade CTA; the blocked upload SHALL NOT count toward the limit.
8. WHEN a rate limit is reached, THE Rate_Limiter SHALL display a message that includes a CTA specific to the user's tier (registration CTA for Anonymous_Users, Pro upgrade CTA for Free_Users) and SHALL NOT display a generic error message.

---

### Requirement 7: Anonymous-to-Free Conversion

**User Story:** As an Anonymous user who has just analyzed a route, I want to be prompted to save my results for free, so that I don't lose my work when the tab closes.

#### Acceptance Criteria

1. WHEN an Anonymous_User's GPX analysis results are fully rendered in the browser, THE Auth_System SHALL display a non-blocking prompt that does not prevent the user from interacting with the analysis; the prompt SHALL be dismissible and SHALL NOT be re-displayed after dismissal within the same browser session.
2. IF an Anonymous_User has not yet completed a GPX analysis, THEN THE Auth_System SHALL NOT display any registration prompts.
3. WHEN an Anonymous_User completes registration while GPX analysis results are present in the browser session, THE Route_Store SHALL automatically persist those results as the user's first saved route without requiring re-upload, provided the session state has not been cleared.
4. IF the automatic route persistence after sign-up fails, THEN THE Route_Store SHALL display an error message with an option to retry the save manually.

---

### Requirement 8: Payment Processing

**User Story:** As a user ready to upgrade, I want to pay securely through a trusted Indonesian payment gateway, so that I can activate my Pro subscription immediately.

#### Acceptance Criteria

1. THE Payment_Gateway SHALL process subscription payments exclusively through Midtrans.
2. THE Payment_Gateway SHALL offer a monthly subscription at Rp 49.000 per month.
3. THE Payment_Gateway SHALL offer an annual subscription at Rp 399.000 per year.
4. IF a user initiates a new Pro subscription and the account has never had the Introductory_Price applied, THEN THE Payment_Gateway SHALL charge Rp 29.000 for the first billing period.
5. WHEN a user views the checkout screen, THE Payment_Gateway SHALL display both the Introductory_Price (Rp 29.000) and the normal recurring price (Rp 49.000/month) in the same view.
6. THE Subscription_System SHALL track whether the Introductory_Price has been applied per account; once applied, THE Subscription_System SHALL NOT apply it again, regardless of subscription cancellations and re-subscriptions.
7. WHEN a payment is successfully processed, THE Subscription_System SHALL activate the user's Pro subscription within 30 seconds of receiving the payment confirmation from Midtrans.
8. WHEN a subscription payment attempt fails, THE Subscription_System SHALL retain the user at their current tier and begin a Grace_Period of exactly 3 days from the timestamp at which Midtrans reported the payment failure; no subscription tier change SHALL occur due to the failed payment attempt itself.
9. WHILE a subscription is in Grace_Period, THE Subscription_System SHALL retain the same Pro tier feature access the user had before the payment failure.
10. WHEN the Grace_Period expires without a successful payment, THE Subscription_System SHALL downgrade the user to Free tier.
11. WHEN a user makes a successful payment while their subscription is in Grace_Period, THE Subscription_System SHALL restore Active subscription status and cancel the pending downgrade.
12. WHEN the Midtrans payment gateway is unavailable at checkout, THE Subscription_System SHALL display an error message and SHALL NOT mutate the user's subscription state.
13. THE Subscription_System SHALL NOT provide refunds for subscription periods already completed.
14. WHEN a Pro_User cancels their subscription, THE Subscription_System SHALL schedule a downgrade to Free tier at the current period_end date, not immediately.

---

### Requirement 9: Dunning (Payment Failure Notifications)

**User Story:** As a Pro user whose payment has failed, I want to be notified clearly so that I can resolve the issue before my access is removed.

#### Acceptance Criteria

1. WHEN a subscription enters Grace_Period, THE Subscription_System SHALL send a dunning email to the account's verified email address; THE Subscription_System SHALL send a second email on the day before Grace_Period expiry; each email SHALL include the number of days remaining in the Grace_Period, including when zero days remain.
2. WHILE a subscription is in Grace_Period, THE Subscription_System SHALL display a banner in the app that allows the user to continue navigating and interacting with all other UI elements; a banner dismissed by the user SHALL reappear on the user's next login during the same Grace_Period.
3. THE Subscription_System SHALL NOT remove Pro feature access while a subscription is in Grace_Period.
4. THE in-app Grace_Period banner SHALL be dismissible by the user.
5. IF the dunning email cannot be delivered due to a delivery failure, THEN THE Subscription_System SHALL ensure the in-app banner is displayed on the user's next authenticated page load as the primary notification channel.

---

### Requirement 10: Pro Downgrade Behavior

**User Story:** As a Pro user who has cancelled or been downgraded, I want my historical data preserved and my previously created share links to remain active.

#### Acceptance Criteria

1. WHEN a Pro_User is downgraded to Free tier, THE Route_Store SHALL retain all routes beyond the 3-route limit in a read-only state, where the user can view and delete but not edit or overwrite those routes.
2. WHEN a Pro_User is downgraded to Free tier, THE Access_Guard SHALL disable Pro-only feature controls (waypoint editing, weather, export, pace estimator) on all routes and display an Upgrade_Prompt on each disabled control.
3. WHEN a Pro_User is downgraded to Free tier, THE Route_Store SHALL keep all Share_Links created during the Pro subscription permanently accessible to recipients.
4. WHEN a downgraded user manually revokes a Share_Link from their dashboard, THE Route_Store SHALL deactivate that Share_Link within 5 seconds of revocation; subsequent requests to that URL SHALL return a 404 response.
5. WHEN a downgraded Free_User re-upgrades to Pro, THE Route_Store SHALL restore all read-only routes to full read-write access and unlock all Pro-only features on those routes.

---

### Requirement 11: Share Links

**User Story:** As a Pro user, I want to generate a view-only share link for my route, so that others can see my analysis without needing an account.

#### Acceptance Criteria

1. THE Route_Store SHALL enforce at the data layer that Share_Link creation is restricted to Pro_Users only, independent of the UI-level gate in Requirement 3.
2. WHEN a Pro_User creates a Share_Link, THE Route_Store SHALL generate a unique URL containing a cryptographically random token of at least 128 bits of entropy, providing a publicly accessible read-only view of the route analysis; a maximum of 5 Share_Links may exist per route simultaneously.
3. WHEN a recipient visits a Share_Link, THE Access_Guard SHALL NOT require the recipient to be authenticated or have a Pro subscription.
4. WHEN the route owner's Pro subscription ends, THE Route_Store SHALL keep existing Share_Links active and accessible.
5. WHEN the route owner revokes a Share_Link, THE Route_Store SHALL deactivate the link within 60 seconds of revocation; subsequent requests to that URL SHALL return a 404 response.
6. WHEN a recipient visits a Share_Link for a route that has been soft-deleted, THE Access_Guard SHALL return a 404 response.

---

### Requirement 12: Introductory Pricing Integrity

**User Story:** As a product owner, I want the introductory price to apply exactly once per account lifetime, so that it cannot be exploited by cancelling and re-subscribing.

#### Acceptance Criteria

1. THE Subscription_System SHALL persist a per-account record of whether the Introductory_Price has been applied, stored in the accounts table in Supabase and not derivable from subscription history alone.
2. WHEN a new Pro subscription is created for an account where the Introductory_Price has not been applied, THE Subscription_System SHALL charge Rp 29.000 for the first billing period and mark the Introductory_Price as applied for that account.
3. IF a new Pro subscription is created for an account where the Introductory_Price has already been applied, THEN THE Subscription_System SHALL charge the normal price (Rp 49.000 for monthly, Rp 399.000 for annual) for the first billing period.
4. WHEN a subscription is cancelled or expires, THE Subscription_System SHALL NOT reset the Introductory_Price applied record for that account.
5. WHEN a user switches between monthly and annual plans, THE Subscription_System SHALL NOT reset the Introductory_Price applied record for that account.
6. WHEN a user registers a new account using an email address previously associated with a deleted account, THE Subscription_System SHALL inherit the Introductory_Price applied record from the deleted account's email address.
7. WHEN the Introductory_Price applied record for an existing account is updated, THE Subscription_System SHALL apply the update atomically with the subscription creation to prevent race conditions where two simultaneous subscription attempts both read the flag as false.

---

### Requirement 13: GPX File Constraints

**User Story:** As a system operator, I want file size limits enforced per tier, so that server resources are protected.

#### Acceptance Criteria

1. IF a GPX file upload request is received from an Anonymous_User or Free_User and the file size exceeds 10,485,760 bytes (10 MB), THEN THE Access_Guard SHALL reject the upload before processing and return an error response.
2. IF a GPX file upload request is received from a Pro_User and the file size exceeds 26,214,400 bytes (25 MB), THEN THE Access_Guard SHALL reject the upload before processing and return an error response.
3. WHEN a file upload is rejected due to size, THE Access_Guard SHALL return a response containing the applicable size limit and the user's current tier name.

---

### Requirement 14: Pricing Page

**User Story:** As a prospective user, I want a clear pricing page showing all tier features and costs, so that I can make an informed decision about upgrading.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a dedicated pricing page that lists all three tiers (Anonymous, Free, Pro) with their respective feature sets.
2. THE pricing page SHALL display the Introductory_Price (Rp 29.000 for the first month) and the normal monthly price (Rp 49.000/month) in the same view, both visible without scrolling on desktop.
3. THE pricing page SHALL display the annual price as Rp 399.000/year together with the equivalent monthly cost of Rp 33.250/month.
4. WHEN a logged-in user whose Introductory_Price has not been applied visits the pricing page, THE pricing page SHALL render the introductory offer with a visually distinct label or badge (e.g., "Intro price") adjacent to the Rp 29.000 price.
5. WHEN a logged-in user whose Introductory_Price has already been applied visits the pricing page, THE pricing page SHALL display the normal monthly price (Rp 49.000/month) without any introductory offer label or badge.
6. WHEN a non-authenticated user visits the pricing page, THE pricing page SHALL display the introductory offer with the same visually distinct label or badge as criterion 4.
7. IF the pricing page cannot determine the user's Introductory_Price eligibility due to an authentication or data fetch error, THEN THE pricing page SHALL display the introductory offer as the default fallback.
