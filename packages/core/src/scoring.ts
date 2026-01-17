import {
  DEFAULT_INTEREST_RATE,
  DEFAULT_LOAN_TERM_YEARS,
  DEFAULT_DOWN_PAYMENT_PCT,
  Listing,
  UserSearch,
  ScoreBreakdown,
  NeighborhoodSignals,
  MarketSignals,
  DEFAULT_WEIGHTS,
  normalizeWeights,
} from './index';

/**
 * Calculate monthly mortgage payment using the standard formula:
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * where P = principal, r = monthly rate, n = number of payments
 */
export function calculateMonthlyPayment(
  homePrice: number,
  downPaymentPct: number = DEFAULT_DOWN_PAYMENT_PCT,
  annualInterestRate: number = DEFAULT_INTEREST_RATE,
  loanTermYears: number = DEFAULT_LOAN_TERM_YEARS
): number {
  const principal = homePrice * (1 - downPaymentPct);
  const monthlyRate = annualInterestRate / 12;
  const numPayments = loanTermYears * 12;

  if (monthlyRate === 0) {
    return principal / numPayments;
  }

  const numerator = monthlyRate * Math.pow(1 + monthlyRate, numPayments);
  const denominator = Math.pow(1 + monthlyRate, numPayments) - 1;
  return principal * (numerator / denominator);
}

/**
 * Estimate monthly taxes and insurance
 */
export function estimateMonthlyTaxesInsurance(listing: Listing): number {
  const estimatedTaxes = listing.taxesAnnualEstimate || listing.price * 0.012; // 1.2% default
  const estimatedInsurance = listing.insuranceAnnualEstimate || listing.price * 0.006; // 0.6% default
  return (estimatedTaxes + estimatedInsurance) / 12;
}

/**
 * Compute total monthly housing cost estimate
 */
export function estimateTotalMonthlyPayment(listing: Listing): number {
  const mortgagePayment = calculateMonthlyPayment(listing.price);
  const taxesInsurance = estimateMonthlyTaxesInsurance(listing);
  const hoa = listing.hoaMonthly || 0;
  return mortgagePayment + taxesInsurance + hoa;
}

/**
 * Affordability score: 0-100 based on housing cost vs budget headroom
 * - Score 100 if monthly payment is 25% below max budget (safe DTI)
 * - Score 50 if monthly payment is exactly at DTI threshold (~33% of gross monthly)
 * - Score 0 if unaffordable or exceeds budget
 */
export function calculateAffordabilityScore(
  listing: Listing,
  search: UserSearch
): number {
  const monthlyPayment = estimateTotalMonthlyPayment(listing);

  // Rough DTI heuristic: assume 33% of gross income suitable for housing
  // Back-solve: if monthly payment = 33% of gross, then gross ≈ monthlyPayment / 0.33
  // For budgeting: assume user can allocate up to 33% of budget-derived income
  const monthlyBudgetCapacity = (search.budgetMax + search.budgetMin) / 2 / 360; // rough monthly allocation
  const safePayment = monthlyBudgetCapacity * 0.25; // 25% of median budget as "safe" threshold
  const maxPayment = monthlyBudgetCapacity * 0.33; // 33% DTI threshold

  if (monthlyPayment > maxPayment) {
    return 0;
  }
  if (monthlyPayment <= safePayment) {
    return 100;
  }

  // Linear interpolation between safe and max
  return Math.round(((maxPayment - monthlyPayment) / (maxPayment - safePayment)) * 100);
}

/**
 * Commute score: 0-100 based on commute minutes vs max allowed
 */
export function calculateCommuteScore(
  actualMinutes: number,
  maxMinutes: number | null
): number {
  if (!maxMinutes) {
    return 75; // neutral score if no commute constraint
  }

  if (actualMinutes <= maxMinutes) {
    // Score 100 if within budget, decreasing with how much buffer used
    const buffer = maxMinutes * 0.2; // 20% buffer = ideal
    if (actualMinutes <= maxMinutes - buffer) {
      return 100;
    }
    return Math.round(100 - ((actualMinutes - (maxMinutes - buffer)) / buffer) * 25);
  }

  // Over budget: penalize ~10 points per minute over
  const overage = actualMinutes - maxMinutes;
  return Math.max(0, Math.round(75 - overage * 5));
}

/**
 * Neighborhood score: 0-100 based on schools, safety, walkability, adjusted by risk tolerance
 */
export function calculateNeighborhoodScore(
  signals: NeighborhoodSignals,
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH'
): number {
  const schoolWeight = 0.4; // 40% schools
  const safetyWeight = riskTolerance === 'LOW' ? 0.4 : riskTolerance === 'MEDIUM' ? 0.3 : 0.2;
  const walkabilityWeight = 1 - schoolWeight - safetyWeight;

  const schoolScore = (signals.schoolRating / 10) * 100;
  const safetyScore = signals.safetyIndex;
  const walkScore = signals.walkability;

  return Math.round(
    schoolScore * schoolWeight + safetyScore * safetyWeight + walkScore * walkabilityWeight
  );
}

/**
 * Property quality score: 0-100 based on age, size, features, property type
 */
export function calculatePropertyQualityScore(listing: Listing): number {
  let score = 50; // baseline

  // Age adjustment: newer is better, very old is penalized
  if (listing.yearBuilt) {
    const age = new Date().getFullYear() - listing.yearBuilt;
    if (age <= 5) {
      score += 20; // Recent construction
    } else if (age <= 20) {
      score += 10;
    } else if (age > 50) {
      score -= 15; // Older homes may need updates
    }
  }

  // Size adjustment
  if (listing.sqft > 2500) {
    score += 10; // Generous size
  } else if (listing.sqft < 1200) {
    score -= 5; // Compact
  }

  // Features bonus
  score += Math.min(listing.features.length * 5, 15); // Up to 15 points for features

  // Property type adjustment (preference flexibility)
  if (listing.propertyType === 'SINGLE_FAMILY') {
    score += 5; // Slight preference for single family
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Market momentum score: 0-100 based on inventory, days on market, price trends
 */
export function calculateMarketMomentumScore(signals: MarketSignals): number {
  let score = 50;

  // Days on market: fewer is better for buyer (more supply pressure)
  if (signals.medianDaysOnMarket <= 14) {
    score += 10; // Hot market, need to move fast
  } else if (signals.medianDaysOnMarket > 60) {
    score += 15; // Buyer friendly, time to negotiate
  } else if (signals.medianDaysOnMarket > 30) {
    score += 5;
  }

  // Inventory level: HIGH is good for buyers, LOW is bad
  if (signals.inventoryLevel === 'HIGH') {
    score += 15;
  } else if (signals.inventoryLevel === 'LOW') {
    score -= 15;
  }

  // Price trends: declining prices are better for buyers
  if (signals.yoyPriceChangePct < -2) {
    score += 15; // Buyer market
  } else if (signals.yoyPriceChangePct < 2) {
    score += 5; // Stable
  } else if (signals.yoyPriceChangePct > 5) {
    score -= 10; // Strong seller market
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Reason generator: produce exactly 3 human-friendly explanations
 */
export function generateScoreReasons(
  listing: Listing,
  search: UserSearch,
  scores: {
    affordability: number;
    commute: number;
    neighborhood: number;
    propertyQuality: number;
    marketMomentum: number;
  }
): string[] {
  const reasons: string[] = [];

  // Find top 3 reasons
  const factors = [
    {
      score: scores.affordability,
      label: `affordability (${Math.round(scores.affordability)}/100)`,
      reason:
        scores.affordability > 75
          ? 'Monthly payment fits comfortably in budget'
          : scores.affordability > 50
            ? 'Monthly payment within acceptable range'
            : 'Monthly payment may stretch budget',
    },
    {
      score: scores.commute,
      label: `commute (${Math.round(scores.commute)}/100)`,
      reason:
        scores.commute > 80
          ? search.commuteMaxMinutes
            ? `Commute is well under ${search.commuteMaxMinutes} minute target`
            : 'Excellent commute profile'
          : scores.commute > 50
            ? search.commuteMaxMinutes
              ? `Commute near target of ${search.commuteMaxMinutes} minutes`
              : 'Reasonable commute'
            : search.commuteMaxMinutes
              ? `Commute exceeds ${search.commuteMaxMinutes} minute target`
              : 'Longer commute may be a concern',
    },
    {
      score: scores.neighborhood,
      label: `neighborhood (${Math.round(scores.neighborhood)}/100)`,
      reason:
        scores.neighborhood > 75
          ? 'Strong schools, safety, and walkability'
          : scores.neighborhood > 50
            ? 'Good neighborhood profile'
            : 'Neighborhood signals are mixed',
    },
    {
      score: scores.propertyQuality,
      label: `property quality (${Math.round(scores.propertyQuality)}/100)`,
      reason:
        scores.propertyQuality > 75
          ? `${listing.beds}bd/${listing.baths}ba, ${listing.sqft.toLocaleString()}sqft with good features`
          : scores.propertyQuality > 50
            ? `${listing.beds}bd/${listing.baths}ba with adequate size and features`
            : 'Property is functional but may have limited appeal',
    },
    {
      score: scores.marketMomentum,
      label: `market momentum (${Math.round(scores.marketMomentum)}/100)`,
      reason:
        scores.marketMomentum > 75
          ? 'Buyer-friendly market conditions'
          : scores.marketMomentum > 50
            ? 'Market conditions are neutral'
            : 'Competitive seller market',
    },
  ];

  // Sort by score descending and take top 3
  const topThree = factors.sort((a, b) => b.score - a.score).slice(0, 3);
  return topThree.map((f) => f.reason);
}

/**
 * Main scoring function: compute comprehensive score breakdown
 */
export function scoreListings(
  listing: Listing,
  search: UserSearch,
  neighborhoodSignals: NeighborhoodSignals,
  marketSignals: MarketSignals,
  commuteMinutes: number
): ScoreBreakdown {
  const weights = normalizeWeights(search.weights);

  const affordabilityScore = calculateAffordabilityScore(listing, search);
  const commuteScore = calculateCommuteScore(commuteMinutes, search.commuteMaxMinutes);
  const neighborhoodScore = calculateNeighborhoodScore(
    neighborhoodSignals,
    search.riskTolerance
  );
  const propertyQualityScore = calculatePropertyQualityScore(listing);
  const marketMomentumScore = calculateMarketMomentumScore(marketSignals);

  const overallScore = Math.round(
    affordabilityScore * weights.affordability +
      commuteScore * weights.commute +
      neighborhoodScore * weights.neighborhood +
      propertyQualityScore * weights.propertyQuality +
      marketMomentumScore * weights.marketMomentum
  );

  const reasons = generateScoreReasons(listing, search, {
    affordability: affordabilityScore,
    commute: commuteScore,
    neighborhood: neighborhoodScore,
    propertyQuality: propertyQualityScore,
    marketMomentum: marketMomentumScore,
  });

  return {
    listingId: listing.id,
    affordabilityScore,
    commuteScore,
    neighborhoodScore,
    propertyQualityScore,
    marketMomentumScore,
    overallScore,
    reasons,
    weights,
  };
}
