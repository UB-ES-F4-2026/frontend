# Grupo F4: Product and Domain Overview

## Product vision

Grupo F4 is a web-based collective investment marketplace designed to make asset-backed and business investments accessible to people who cannot, or do not wish to, finance an entire asset or business opportunity individually.

Users discover investment opportunities, commit capital to a fraction of an opportunity, and track their participation and any subsequent financial distributions. The intended benefit is access to diversified investments and potential passive income. **Returns are uncertain and never guaranteed.**

This document describes the intended product domain, not a statement that every feature is already implemented.

## Investment categories

### Real estate

1. A user proposes an initiative to acquire a particular property and specifies the amount required to finance it.
2. The proposer commits to financing a portion of the acquisition.
3. Other users can join the initiative by committing to finance additional portions.
4. Contributions accumulate toward a collective funding target.
5. Once the target is met, the proposed business process proceeds toward acquisition of the property, subject to any required checks, contracts and closing conditions.
6. If the acquired property produces distributable income, such as rental income, participating investors receive distributions proportional to their economic interests, subject to applicable expenses and agreed terms.

**Example:** A property costs €300,000. Investors collectively commit to fund 100% of the required amount. Someone holding a 10% economic participation would be entitled to 10% of the distributable proceeds under a strictly proportional distribution model, not necessarily 10% of the gross rent.

### Startups and small businesses

1. An owner of an existing startup or small business offers a defined portion of the business for investment.
2. Investors acquire or subscribe to fractional economic interests under the terms of that opportunity.
3. Investors can monitor their positions and receive any distributions to which those interests entitle them.

Unlike rent, **business profits do not automatically become payouts**. A business may retain or reinvest profits. Dividend or profit-sharing rights depend on the investment instrument and its terms.

## Shared domain concepts

- **User:** A person interacting with the marketplace; a user may initiate an opportunity, invest, or both.
- **Opportunity:** An investable proposal listed on the platform, regardless of asset category.
- **Initiator / seller:** A person proposing an acquisition or offering an economic interest in a business.
- **Investor:** A user funding or holding an interest in an opportunity.
- **Funding target:** The amount an opportunity seeks to raise. Its relationship to the purchase price and fees must be defined for each opportunity.
- **Commitment:** A proposed contribution to an opportunity. A commitment must not be conflated with payment, settlement or legal ownership.
- **Funding progress:** Capital committed or actually collected compared with the target. The interface must state which one is being shown.
- **Participation:** The fraction or economic interest attributed to an investor, determined by the applicable offering terms.
- **Distribution:** A payment of income or proceeds to investors under the rights and rules of the investment.

## General lifecycle

```text
Opportunity proposed
    -> Published / open for funding
    -> Investors commit to participate
    -> Funding target reached (or funding fails/expires)
    -> Closing and settlement, if all conditions are satisfied
    -> Active investment / holding
    -> Income, distributions and reporting, where applicable
```

This lifecycle is a conceptual model. It does not imply that all transitions, statuses, payments, or reporting workflows have already been implemented.

## Product principles

1. **Category-agnostic UI:** Prefer shared terms such as `opportunity`, `investment`, `funding`, and `participation`. Use property-specific or business-specific terminology only where necessary.
2. **Transparency:** Clearly distinguish target funding, commitments, actual payments, ownership or contractual economic interests, projected returns and realized distributions.
3. **No guaranteed earnings:** Never market investments as risk-free, guaranteed income or guaranteed liquidity.
4. **Proportionality with explicit terms:** Use proportional distribution only where the opportunity's legal and economic terms call for it; distinguish gross revenue, expenses and distributable proceeds.
5. **Access and diversification:** The product seeks to lower minimum-capital barriers and permit investment across multiple opportunities.

## Matters not yet specified

Agents must **not invent product rules** for the following. Inspect the relevant user stories, application code and team decisions, or flag the matter as unresolved:

- Legal vehicle and meaning of ownership (direct title, shares, SPV interests, contracts, etc.).
- Jurisdiction and regulatory requirements, including identity verification, crowdfunding/investment rules and investor protections.
- How money is collected, held, refunded and settled; treatment of incomplete or oversubscribed opportunities.
- Minimum investment, valuation, fees, dilution, cancellation and transfer of interests.
- Rental expenses, taxes, reserves and distribution timing.
- Profit distribution policy, voting rights and investor rights for businesses.
- Secondary markets, early exits and handling of business failure or property losses.
- Whether the current course-project MVP simulates financial transactions rather than moving real funds.

## Scope and implementation notes

This is a Software Engineering course project, not evidence of a licensed or production-ready financial service. Implement only the behavior required by the current backlog and acceptance criteria. A feature described here may be part of the **product vision** rather than the **current MVP**.

The repository's root `AGENTS.md` is the source of truth for agent implementation guidance, UI language, design conventions and frontend technology. This document provides the business-domain context and must not override explicit, more recent backlog decisions.
