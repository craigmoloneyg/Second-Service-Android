# Native Garnish accounting — first implementation

This module is owned and run by Garnish. It does not call MYOB or Xero. It is a
first implementation for review, **not a complete accounting/payroll replacement**.
Do not advertise it as ready for tax lodgement or automated payroll.

## Implemented

- An Accounting route within the current app, available in desktop and mobile navigation.
- Authenticated, account-scoped D1 storage, optimistic revision checks and duplicate-request protection.
- Integer-cent transactions with explicit tax classifications and actual document GST.
- Sales, supplier purchases, refunds, unpaid documents and full settlements.
- Double-entry journals, trial balance, recorded P&L, receivables and payables.
- Cash-basis GST working figures (G1, 1A, 1B) and ordinary wage-payment W1/W2 totals.
- Invoice review from the existing workspace; no automatic posting of AI-extracted amounts.
- Earnings-line calculations, net pay and employer super using explicitly entered,
  verified PAYG, hourly rates, super base and super rate. Records represent payments
  already made, not payroll execution.
- Optional user-selected profit reserve, clearly separated from an income tax assessment.
- Append-only record history with dated reversals, full JSON export and journal CSV export.
- Sign-up account-takeover fix in the deployed Worker entrypoint; sign-out now revokes sessions.

No remote data has been migrated. The new table is created on first authenticated
use. Existing invoices, Square connections and workspace documents stay intact.
The new accounting book does not infer opening balances from incomplete records.

## Supported scope and limits

AUD only. Business-use portions only. Cash GST reporting only; P&L uses document
dates and records purchases as costs without inventory adjustments. Mixed GST
requires separate lines. Partial payments, deposits, non-cash GST and special GST
schemes/adjustments need additional implementation. Expense and asset categories
are fixed in this release. Payroll supports ordinary wage-payment recording only.
No salaries sacrificed, termination calculations, special withholding or leave
accrual is implemented. Super/PAYG liabilities cannot yet be discharged through
payment entries. The balance sheet has no opening-balance or general-journal UI.
Report limitations are visible in the app and source exports retain the audit history.
The first-release storage bound is 2 MB / 10,000 audit events per account; it must
be replaced with normalised, paginated ledger tables before broader production use.

## Required to fulfil the full requested product

1. Confirm a complete business/tax profile and opening balances. Build bank import,
   reconciliation, full invoicing/payment allocation, credit notes, inventory/COGS,
   general journals, assets/depreciation and period locking.
2. Obtain and independently verify current ATO payroll schedules and effective dates.
   Implement employee declarations, residency, HELP, Medicare adjustments, withholding
   variations, salary sacrifice, allowances and termination rules with reference fixtures.
   Do not substitute annual marginal tax brackets for payroll withholding tables.
3. Add applicable Fair Work award classifications, penalties, overtime and leave rules,
   pay-run approvals and compliant payslips. Validate with a qualified payroll reviewer.
4. Implement super eligibility, qualifying earnings, caps and effective-date rules,
   contribution submission and reconciliation. Current calculations intentionally
   require verified user input; no statutory rate is silently assumed.
5. Build BAS adjustments and other applicable labels, cash/non-cash methods, report
   locking, reconciliation and lodgement receipts. Add entity-specific income tax
   estimates with tax adjustments; a profit-reserve percentage is not this calculation.
6. Arrange ATO DSP/SBR/STP onboarding or an embedded compliant sending service for
   lodgement. Garnish can own the product/UI while using a submission service.
   Bank feeds, payments and super remittance similarly require authorised external rails.
7. Independent accounting/payroll/security review, backups and restore checks,
   operational monitoring and end-to-end staging validation before a production release.

ATO developer starting point: https://softwaredevelopers.ato.gov.au/ . Official
tax-table pages were not retrievable during this implementation, so no unverified
current-year withholding table was embedded.

## Validation and release

Run `npm ci` and `npm test` on Node 22.13+ or Node 24. New tests cover monetary
arithmetic, mixed taxes, payment timing, reversals, wage recording, balance checks,
account isolation, expired sessions, CSRF, idempotency, revision conflicts,
account takeover prevention, logout revocation and the browser Accounting flow.

The existing Cloudflare Worker entrypoint loads the route and UI. A native app
rebuild is not required to display the change after a verified website deployment.
Do not deploy a separate Sites project or replace the marketing site. Publish
only through the existing Cloudflare project after review and release authorisation.

## GST automation and ATO status — 19 September 2026

New transaction lines require an explicit tax classification. Standard automatic
GST uses the GST-inclusive amount divided by 11, rounded per line to cents.
The server recomputes automatic amounts; it does not trust browser previews.
Invoice mode preserves the supplier's entered GST, including rounding differences.
Existing records retain their original amounts. Imported invoice GST remains in
invoice mode, and a zero or absent extracted tax does not establish GST-free status.
Purchase GST credits still require the existing eligibility confirmation.

Source checked: https://business.gov.au/registrations/register-for-taxes/register-for-goods-and-services-tax-gst
This standard calculation is not support for special GST schemes or an automatic
classification of restaurant ingredients. Split mixed treatments into separate lines.

Reports offer a clearly labelled NOT LODGED CSV of the supported BAS working
figures and their limitations. The ATO connection remains unavailable. No export
or local calculation constitutes a submission, receipt, or payment.

Direct ATO delivery requires DSP registration, service-specific specifications,
EVTE testing, security evidence, production verification and whitelisting:
https://softwaredevelopers.ato.gov.au/getting_started
https://softwaredevelopers.ato.gov.au/operational_framework
These steps have not been completed for Garnish in this work. No credentials or
ATO registrations were created. Before implementing a transport, obtain access to
the relevant activity-statement service specification and test credentials through
Online services for DSPs. Do not collect users' ATO passwords in Garnish.

Automatic employee PAYG remains blocked on verified effective-dated ATO
withholding schedules and employee declaration inputs. Current official tables
could not be retrieved reliably during this change. Do not substitute annual
marginal income-tax brackets for payroll withholding, silently use old schedules,
or label the optional reserve percentage as tax payable. Income-tax assessments,
HELP, Medicare variations and special payments remain outside current coverage.
