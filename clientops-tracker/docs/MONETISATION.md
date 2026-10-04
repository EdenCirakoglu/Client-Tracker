# Commercial Offers and Sales Setup

ClientOps Tracker is an open-source support and delivery operations platform for small software teams. Start by selling a useful service, not access to a public repository. These offers are hypotheses to validate with customers, not claims of proven demand.

## Keep MIT Unchanged

The root and workspace `LICENSE` files retain the standard MIT text and attribution to Eden Cirakoglu. The workspace, API and web package metadata declare `MIT`; `private: true` still prevents accidental npm publication, not commercial use.

MIT permits selling copies as well as modification and redistribution, subject to preserving its notices. Others may use the public code without purchasing anything from its maintainer. Paid services do not revoke those rights or add a non-commercial restriction. [MIT licence overview](https://choosealicense.com/licenses/mit/).

Keep service scope, payment conditions and support commitments in a separate agreement. Preserve third-party licence notices when distributing a deployment. This guide describes the product model; customer terms need appropriate review before taking orders.

## Offer Priorities

| Offer                  | What the customer pays for                                                | Recommendation                                            |
| ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| Assisted installation  | Working private deployment, configuration, agreed branding and onboarding | Start here, with a written scope and acceptance checklist |
| Managed instance       | Hosting, upgrades, backups, monitoring and defined support                | Introduce after real operational acceptance               |
| Custom implementation  | Migration, workflow changes and integrations                              | Offer selectively with an agreed scope                    |
| GitHub sponsorship     | Development and maintenance of the open-source project                    | Optional funding, separate from service purchases         |
| GitHub Marketplace app | A maintained integration with GitHub                                      | Longer-term route, not the current checkout               |

The [service information page](SERVICES.md) describes the proposed initial offer. There is no configured booking URL, checkout, price or sponsor account in this repository yet. No managed service or live deployment is claimed.

## First Sale Without In-App Billing

1. Publish a product page covering the installation scope, exclusions, prerequisites, handover and demo-booking method. Do not request credentials or production data in a booking form.
2. Confirm the payment provider supports the seller's country, business and account. Stripe offers a hosted [Payment Link](https://docs.stripe.com/payment-links) without building a billing UI; check its [availability](https://stripe.com/global) before choosing it. No account eligibility is assumed here.
3. Set the actual price, currency, payment conditions, cancellation/refund terms and customer support contact. Confirm capacity and deployment prerequisites before accepting an order.
4. Create and test the external checkout in the provider's test environment. Verify the service description, receipt, cancellation path and return to the product page. Do not put API keys, customer credentials or payment details in GitHub.
5. Replace the **Book a demo** destinations in both `README.md` files with the public product/demo page, and **Buy installation** with the actual provider-hosted checkout URL. Update `SERVICES.md` with those same destinations and remove the unavailable notices only once tested.
6. For the first installations, verify payment in the provider dashboard and coordinate delivery manually. A browser success redirect is not proof of payment. Do not automatically provision accounts or infrastructure from it.

This setup adds no billing tables, subscription gates, payment webhooks or licence-key checks to ClientOps. Self-hosting remains available without a purchase. Tax, invoicing and customer terms remain the seller's responsibilities; a payment link does not settle those obligations.

### URLs and Decisions Needed Before Activation

| Input                                                                     | Used for                                                             |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Public product page and demo-booking destination                          | `Book a demo` in both READMEs and `SERVICES.md`                      |
| Tested external installation checkout URL                                 | `Buy installation` in both READMEs and `SERVICES.md`                 |
| Scope, exclusions, price/currency, cancellation terms and support contact | Product page, checkout description and separate service agreement    |
| Optional verified sponsorship profile or funding URL                      | A separately labelled funding section and root `.github/FUNDING.yml` |

Current README links deliberately point to the local service information sections until real URLs are supplied. They cannot accept bookings or payments. Do not replace them with invented checkout addresses or test links presented as live offers.

### Repository-Owned Information URLs

Use the existing repository rather than inventing a domain. Once these files have been reviewed and published on `main`, the public information destinations will be:

```text
Product and services:
https://github.com/EdenCirakoglu/Client-Tracker/blob/main/clientops-tracker/docs/SERVICES.md

Demo information:
https://github.com/EdenCirakoglu/Client-Tracker/blob/main/clientops-tracker/docs/SERVICES.md#book-a-demo

Installation information:
https://github.com/EdenCirakoglu/Client-Tracker/blob/main/clientops-tracker/docs/SERVICES.md#buy-installation
```

The READMEs use relative equivalents so they also work on a review branch and in a local clone. These URLs are documentation destinations, not an appointment scheduler or checkout. Until the changes are published, the new public pages are not claimed to exist.

For live transactions, the maintainer must choose and configure a booking/contact service and an eligible payment-provider account. Create the installation product in that provider's dashboard, complete its required verification, test the purchase flow, and copy the provider-generated payment URL into both READMEs. A Stripe Payment Link is assigned by Stripe; it cannot be invented or activated by editing this repository. Keep the booking and checkout unavailable notices until the respective destinations actually work. No account, charge, site publication or deployment is created by this documentation change.

## Sponsorship Is Not Checkout

Label funding **Sponsor development**, separately from **Buy installation**. Sponsorship supports maintenance; it does not purchase a deployment or imply a support commitment.

Once an active funding destination is supplied, configure `.github/FUNDING.yml` at the Git root on the default branch, not inside the pnpm workspace. GitHub documents this [Sponsor button configuration](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository). Do not use a funding link as a disguised installation checkout. No active funding file is added before a destination is confirmed.

## GitHub Marketplace Is a Separate Product

Requirements checked on 2026-09-23: a Marketplace app must integrate with GitHub beyond authentication. Paid listings require an organisation that is a verified publisher; GitHub specifies at least 100 installations for GitHub Apps and handling of purchase/plan-change events. Other listing and billing requirements also apply. Recheck the [official requirements](https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app) before starting this work.

The existing portal is not a listed Marketplace app. A future reviewed ticket-to-issue or release integration could be a separate undertaking; Marketplace is not an immediate sales mechanism for this repository.

## Managed and Custom Work Later

Use the [operator controls](OPERATOR_CONTROLS.md) and [staging acceptance handoff](RELEASE_CANDIDATE.md) before offering managed hosting: trusted HTTPS/renewal, independent secrets, real SMTP acceptance, restored off-host backups, alerts, security-log retention and named support/recovery owners. Local fixture results do not substitute for external-service acceptance.

Keep migrations, integrations, workflow adaptations and agency/freelancer branding within an agreed scope. Hosting, implementation expertise and support can be paid value while the code remains MIT. Any future separately licensed premium component needs an explicit boundary and appropriate rights; do not describe existing public MIT features as purchase-only or relicense contributions without authority.
