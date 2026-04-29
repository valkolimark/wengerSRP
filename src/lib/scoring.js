// Scoring math. The board state is { [skillArea]: { [behaviorIndex]: true } }.

export const BONUS_MULTIPLIER = 1.5;
export const PERFECT_BUCKET_BONUS = 10;
export const SPEED_BONUS = 15;
export const SPEED_BONUS_THRESHOLD = 0.7; // 70% of behaviors

export function isBonusArea(scenario, area) {
  return (scenario.bonusCategories || []).includes(area);
}

export function pointsForBehavior(scenario, area, basePoints) {
  if (isBonusArea(scenario, area)) return Math.round(basePoints * BONUS_MULTIPLIER);
  return basePoints;
}

export function totalBehaviors(scenario) {
  return Object.values(scenario.scorecard).reduce((acc, list) => acc + list.length, 0);
}

export function totalChecked(checks) {
  let n = 0;
  Object.values(checks).forEach((areaChecks) => {
    Object.values(areaChecks).forEach((v) => v && n++);
  });
  return n;
}

export function maxPossibleScore(scenario) {
  let total = 0;
  Object.entries(scenario.scorecard).forEach(([area, list]) => {
    list.forEach((b) => {
      total += pointsForBehavior(scenario, area, b.points);
    });
    total += PERFECT_BUCKET_BONUS;
  });
  total += SPEED_BONUS;
  return total;
}

export function computeScore(scenario, checks, { timeRemaining = 0, ended = false } = {}) {
  const breakdown = [];
  let baseTotal = 0;
  let perfectBonusTotal = 0;
  let perfectBuckets = [];

  Object.entries(scenario.scorecard).forEach(([area, list]) => {
    const areaChecks = checks[area] || {};
    let areaPoints = 0;
    let areaPossible = 0;
    let hits = 0;
    list.forEach((b, i) => {
      const pts = pointsForBehavior(scenario, area, b.points);
      areaPossible += pts;
      if (areaChecks[i]) {
        areaPoints += pts;
        hits++;
      }
    });
    let bonus = 0;
    if (hits === list.length && list.length > 0) {
      bonus = PERFECT_BUCKET_BONUS;
      perfectBuckets.push(area);
      perfectBonusTotal += bonus;
    }
    breakdown.push({
      area,
      points: areaPoints,
      possible: areaPossible,
      hits,
      total: list.length,
      perfect: hits === list.length && list.length > 0,
      isBonus: isBonusArea(scenario, area),
      perfectBonus: bonus,
    });
    baseTotal += areaPoints;
  });

  const totalPossible = totalBehaviors(scenario);
  const checkedCount = totalChecked(checks);
  const hitRatio = totalPossible ? checkedCount / totalPossible : 0;
  let speedBonus = 0;
  if (ended && timeRemaining > 0 && hitRatio >= SPEED_BONUS_THRESHOLD) {
    speedBonus = SPEED_BONUS;
  }

  return {
    breakdown,
    baseTotal,
    perfectBonusTotal,
    perfectBuckets,
    speedBonus,
    total: baseTotal + perfectBonusTotal + speedBonus,
    hitRatio,
    checkedCount,
    totalBehaviors: totalPossible,
  };
}
