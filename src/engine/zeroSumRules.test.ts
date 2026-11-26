import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MMR_HISTORY_SESSIONS,
  applyMatchOutcome,
  calculateZeroSumTransfer,
  createDefaultProfile,
  getMmrHistoryStats,
  getRankFromMMR,
  tryPurchaseDraftItem,
  tryPurchasePrestigeItem,
  tryToggleUITheme,
} from './zeroSumRules';

test('Zero Sum ELO transfer strictly conserves MMR across 1v1, 2v2, and 4v4', () => {
  const transfer1v1 = calculateZeroSumTransfer([1200], [1200], true);
  assert.equal(transfer1v1.deltaPerWinner, 16);
  assert.equal(transfer1v1.deltaPerLoser, -16);
  assert.equal(transfer1v1.deltaPerWinner + transfer1v1.deltaPerLoser, 0);

  // Underdog 2v2 team beats higher-rated team => gains more than 16, exact zero-sum
  const transfer2v2 = calculateZeroSumTransfer([1100, 1200], [1400, 1500], true);
  assert.ok(transfer2v2.deltaPerWinner > 20);
  assert.equal(transfer2v2.deltaPerWinner + transfer2v2.deltaPerLoser, 0);

  // 4v4 average conservation
  const transfer4v4 = calculateZeroSumTransfer(
    [1300, 1350, 1250, 1300],
    [1200, 1200, 1250, 1150],
    false
  );
  assert.equal(transfer4v4.teamAAvgMMR, 1300);
  assert.equal(transfer4v4.teamBAvgMMR, 1200);
  assert.equal(transfer4v4.deltaPerWinner + transfer4v4.deltaPerLoser, 0);
});

test('Rank ladder maps MMR thresholds accurately from Fer to Hexproof', () => {
  assert.equal(getRankFromMMR(800).name, 'Fer');
  assert.equal(getRankFromMMR(1050).name, 'Bronze');
  assert.equal(getRankFromMMR(1300).name, 'Argent');
  assert.equal(getRankFromMMR(1550).name, 'Or');
  assert.equal(getRankFromMMR(1850).name, 'Diamant');
  assert.equal(getRankFromMMR(2200).name, 'Hexproof');
});

test('First Win of the Day grants +100% Arena Points once per day and Mastery Zero Sum triggers on 0 damage taken', () => {
  const day = 20050;
  const profile = createDefaultProfile(day);

  const firstWin = applyMatchOutcome(profile, {
    mode: '2v2',
    teamAMMRs: [1240, 1275],
    teamBMMRs: [1258, 1228],
    didWin: true,
    damageDealt: 600,
    damageTaken: 0, // Flawless Zero Sum round!
    dayIndex: day,
  });

  assert.equal(firstWin.firstWinBonusApplied, true);
  assert.equal(firstWin.flawlessZeroSum, true);
  assert.ok(
    firstWin.completedQuests.some((q) => q.questID === 'mastery_zero_sum_flawless')
  );
  // Base 220 * 2 (FWOTD) + 500 (Mastery reward) = 940 AP
  assert.equal(firstWin.arenaPointsEarned, 940);
  assert.equal(firstWin.prestigeTokensEarned, 250);

  // Second win same day should NOT re-trigger FWOTD
  const secondWin = applyMatchOutcome(firstWin.updatedProfile, {
    mode: '2v2',
    teamAMMRs: [1256, 1275],
    teamBMMRs: [1258, 1228],
    didWin: true,
    damageDealt: 400,
    damageTaken: 35,
    dayIndex: day,
  });

  assert.equal(secondWin.firstWinBonusApplied, false);
  assert.equal(secondWin.arenaPointsEarned, 220);
});

test('Draft Shop rejects duplicate items or insufficient Arena Points', () => {
  const profile = createDefaultProfile(20050);
  const firstBuy = tryPurchaseDraftItem(profile, [], 'aura_mending_pulse');
  assert.equal(firstBuy.ok, true);
  assert.equal(firstBuy.profile.arenaPoints, profile.arenaPoints - 200);

  const duplicateBuy = tryPurchaseDraftItem(
    firstBuy.profile,
    firstBuy.purchasedItemIDs,
    'aura_mending_pulse'
  );
  assert.equal(duplicateBuy.ok, false);

  const poorProfile = { ...profile, arenaPoints: 50 };
  const failBuy = tryPurchaseDraftItem(poorProfile, [], 'wpn_pulse_carbine');
  assert.equal(failBuy.ok, false);
});

test('Prestige Shop unlocks Titles and Dark Mode with persistence toggle', () => {
  const base = { ...createDefaultProfile(20050), prestigeTokens: 3000 };

  const lockedToggle = tryToggleUITheme(base);
  assert.equal(lockedToggle.ok, false);

  const buyTitle = tryPurchasePrestigeItem(base, 'title_le_fier');
  assert.equal(buyTitle.ok, true);
  assert.equal(buyTitle.profile.equippedTitle, 'Le Fier');
  assert.equal(buyTitle.profile.prestigeTokens, 2650);

  const buyDark = tryPurchasePrestigeItem(buyTitle.profile, 'theme_dark_mode');
  assert.equal(buyDark.ok, true);
  assert.equal(buyDark.profile.unlockedDarkMode, true);
  assert.equal(buyDark.profile.uiTheme, 'DarkMode');
  assert.equal(buyDark.profile.prestigeTokens, 150);

  const toggleLight = tryToggleUITheme(buyDark.profile);
  assert.equal(toggleLight.ok, true);
  assert.equal(toggleLight.profile.uiTheme, 'LightMode');
});

test('MMR history keeps a rolling window of the last 10 sessions and computes stats', () => {
  const day = 20050;
  const profile = createDefaultProfile(day);
  assert.equal(profile.mmrHistory.length, MAX_MMR_HISTORY_SESSIONS);
  assert.equal(profile.mmrHistory[9].mmr, profile.mmr);
  assert.equal(profile.mmrHistory[0].sessionIndex, 1);

  const outcome = applyMatchOutcome(profile, {
    mode: '1v1',
    teamAMMRs: [profile.mmr],
    teamBMMRs: [profile.mmr],
    didWin: true,
    damageDealt: 300,
    damageTaken: 50,
    dayIndex: day,
  });

  const nextHistory = outcome.updatedProfile.mmrHistory;
  assert.equal(nextHistory.length, MAX_MMR_HISTORY_SESSIONS);
  assert.equal(nextHistory[0].sessionIndex, 2);
  assert.equal(nextHistory[9].sessionIndex, 11);
  assert.equal(nextHistory[9].label, 'S11');
  assert.equal(nextHistory[9].mmr, outcome.updatedProfile.mmr);
  assert.equal(nextHistory[9].result, 'win');

  const stats = getMmrHistoryStats(nextHistory);
  assert.equal(stats.count, 10);
  assert.equal(stats.currentMMR, outcome.updatedProfile.mmr);
  assert.ok(stats.peakMMR >= stats.currentMMR);
  assert.ok(stats.winRatePct >= 0 && stats.winRatePct <= 100);
});
