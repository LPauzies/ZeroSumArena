export type ArenaMode = '1v1' | '2v2' | '4v4';

export type ArenaState =
  | 'State_Initialization'
  | 'State_ShopPhase'
  | 'State_Combat'
  | 'State_Resolution';

export type Archetype = 'DPS' | 'Tank' | 'Support';

export type UIThemeMode = 'LightMode' | 'DarkMode';

export interface QuestData {
  questID: string;
  title: string;
  description: string;
  category: 'Daily' | 'Mastery';
  targetValue: number;
  currentProgress: number;
  rewardArenaPoints: number;
  rewardPrestigeTokens: number;
  isCompleted: boolean;
}

export interface MmrSessionEntry {
  sessionIndex: number;
  label: string;
  mmr: number;
  delta: number;
  mode: ArenaMode;
  result: 'win' | 'loss';
  rankName: string;
  timestamp: number;
}

export interface MmrHistoryStats {
  count: number;
  startMMR: number;
  currentMMR: number;
  netDelta: number;
  peakMMR: number;
  winRatePct: number;
}

export interface PlayerProfile {
  version: number;
  displayName: string;
  mmr: number;
  rankTier: number; // 1=Fer ... 6=Hexproof
  highestRankTier: number;
  totalWins: number;
  totalMatches: number;
  arenaPoints: number;
  prestigeTokens: number;
  lastFirstWinDayIndex: number;
  lastDailyResetDayIndex: number;
  activeQuests: QuestData[];
  unlockedPerks: string[];
  unlockedTitles: string[];
  equippedTitle: string;
  unlockedDarkMode: boolean;
  uiTheme: UIThemeMode;
  mmrHistory: MmrSessionEntry[];
}

export interface RankTierInfo {
  tier: number;
  name: string;
  minMMR: number;
  subtitle: string;
}

export interface DraftItem {
  itemID: string;
  displayName: string;
  category: 'Weapon' | 'Perk' | 'Aura';
  synergyTag: string;
  description: string;
  costArenaPoints: number;
  itemGranterIndex: number;
  recommendedRole: Archetype;
}

export interface PrestigeItem {
  itemID: string;
  displayName: string;
  kind: 'Title' | 'Theme';
  costPrestigeTokens: number;
  description: string;
}

export interface ArchetypeSpec {
  id: Archetype;
  label: string;
  classSelectorIndex: number;
  maxHealth: number;
  maxShield: number;
  moveSpeed: number;
  primaryDamage: number;
  abilityName: string;
  ultimateName: string;
  ultimateCooldown: number;
  summary: string;
}

export interface RosterMember {
  id: string;
  name: string;
  isHuman: boolean;
  team: 'A' | 'B';
  mmr: number;
  rankName: string;
  title?: string;
  archetype: Archetype;
  purchasedItemIDs: string[];
  isReady: boolean;
}

export interface EloTransferResult {
  teamAAvgMMR: number;
  teamBAvgMMR: number;
  expectedTeamAWin: number;
  deltaPerWinner: number;
  deltaPerLoser: number;
}

export interface MatchOutcomeInput {
  mode: ArenaMode;
  teamAMMRs: number[];
  teamBMMRs: number[];
  didWin: boolean;
  damageDealt: number;
  damageTaken: number;
  dayIndex: number;
}

export interface MatchResolutionSummary {
  updatedProfile: PlayerProfile;
  eloTransfer: EloTransferResult;
  playerMMRDelta: number;
  previousRankTier: number;
  newRankTier: number;
  rankUpPrestigeBonus: number;
  baseArenaPoints: number;
  firstWinBonusApplied: boolean;
  arenaPointsEarned: number;
  prestigeTokensEarned: number;
  completedQuests: QuestData[];
  flawlessZeroSum: boolean;
}

export const ZERO_SUM_K_FACTOR = 32;
export const MIN_FLOOR_MMR = 400;
export const HEXPROOF_THRESHOLD_MMR = 2200;

export const RANK_TIERS: RankTierInfo[] = [
  { tier: 1, name: 'Fer', minMMR: 0, subtitle: 'Division d’entrée' },
  { tier: 2, name: 'Bronze', minMMR: 1050, subtitle: 'Fondamentaux d’arène' },
  { tier: 3, name: 'Argent', minMMR: 1300, subtitle: 'Maîtrise des builds' },
  { tier: 4, name: 'Or', minMMR: 1550, subtitle: 'Synergie tactique' },
  { tier: 5, name: 'Diamant', minMMR: 1850, subtitle: 'Élite compétitive' },
  { tier: 6, name: 'Hexproof', minMMR: 2200, subtitle: 'Top 1% · Intouchables' },
];

export const ARCHETYPE_SPECS: Record<Archetype, ArchetypeSpec> = {
  DPS: {
    id: 'DPS',
    label: 'DPS',
    classSelectorIndex: 0,
    maxHealth: 100,
    maxShield: 50,
    moveSpeed: 245,
    primaryDamage: 22,
    abilityName: 'Salve Concentrée [Q]',
    ultimateName: 'Exécution Précise [R]',
    ultimateCooldown: 16,
    summary: 'Pression constante à distance et burst décisif.',
  },
  Tank: {
    id: 'Tank',
    label: 'Tank',
    classSelectorIndex: 1,
    maxHealth: 165,
    maxShield: 100,
    moveSpeed: 210,
    primaryDamage: 18,
    abilityName: 'Barrière Égide [Q]',
    ultimateName: 'Onde Sismique [R]',
    ultimateCooldown: 18,
    summary: 'Contrôle de ligne de vue, absorption et engagement.',
  },
  Support: {
    id: 'Support',
    label: 'Support',
    classSelectorIndex: 2,
    maxHealth: 115,
    maxShield: 75,
    moveSpeed: 230,
    primaryDamage: 14,
    abilityName: 'Impulsion de Soin [Q]',
    ultimateName: 'Sanctuaire d’Équipe [R]',
    ultimateCooldown: 18,
    summary: 'Maintien des PV alliés et accélération d’équipe.',
  },
};

export const DRAFT_CATALOG: DraftItem[] = [
  {
    itemID: 'wpn_pulse_carbine',
    displayName: 'Carabine Précision',
    category: 'Weapon',
    synergyTag: 'Pression Distance',
    description: '+20% dégâts primaires et vélocité de projectile accrue.',
    costArenaPoints: 150,
    itemGranterIndex: 0,
    recommendedRole: 'DPS',
  },
  {
    itemID: 'wpn_breach_shotgun',
    displayName: 'Fusil Brèche',
    category: 'Weapon',
    synergyTag: 'Engagement Rapproché',
    description: 'Salve triple à courte portée pour briser les boucliers.',
    costArenaPoints: 150,
    itemGranterIndex: 1,
    recommendedRole: 'Tank',
  },
  {
    itemID: 'aura_aegis_shield',
    displayName: 'Aura Égide',
    category: 'Aura',
    synergyTag: 'Bouclier Alliés +25',
    description: 'Confère +25 bouclier max à toute l’équipe au début du round.',
    costArenaPoints: 220,
    itemGranterIndex: 2,
    recommendedRole: 'Tank',
  },
  {
    itemID: 'aura_mending_pulse',
    displayName: 'Aura de Soin',
    category: 'Aura',
    synergyTag: 'Soins de Zone',
    description: 'Régénère passivement les PV des alliés proches toutes les 2 s.',
    costArenaPoints: 200,
    itemGranterIndex: 3,
    recommendedRole: 'Support',
  },
  {
    itemID: 'perk_blink_dash',
    displayName: 'Impulsion Cinétique',
    category: 'Perk',
    synergyTag: 'Mobilité / Esquive',
    description: 'Réduit le délai d’esquive de 35% et augmente la vitesse.',
    costArenaPoints: 180,
    itemGranterIndex: 4,
    recommendedRole: 'DPS',
  },
  {
    itemID: 'perk_overcharge_ult',
    displayName: 'Catalyseur Ultime',
    category: 'Perk',
    synergyTag: 'Cooldown Ultime -25%',
    description: 'Réduit le temps de recharge de la compétence ultime de 25%.',
    costArenaPoints: 260,
    itemGranterIndex: 5,
    recommendedRole: 'Support',
  },
];

export const PRESTIGE_CATALOG: PrestigeItem[] = [
  {
    itemID: 'title_le_fier',
    displayName: 'Le Fier',
    kind: 'Title',
    costPrestigeTokens: 350,
    description: 'Titre affiché dans le HUD de Synergie et sur l’écran de résolution.',
  },
  {
    itemID: 'title_zero_absolu',
    displayName: 'Zéro Absolu',
    kind: 'Title',
    costPrestigeTokens: 900,
    description: 'Distinction honorifique des stratèges maîtrisant les rounds parfaits.',
  },
  {
    itemID: 'title_hexproof_elite',
    displayName: 'Intouchable',
    kind: 'Title',
    costPrestigeTokens: 1600,
    description: 'Titre emblématique des joueurs visant le Top 1% Hexproof.',
  },
  {
    itemID: 'theme_dark_mode',
    displayName: 'Dark Mode',
    kind: 'Theme',
    costPrestigeTokens: 2500,
    description: 'Récompense ultime de prestige : bascule toute l’interface Verse Canvas en thème sombre.',
  },
];

export function getCurrentDayIndex(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 86_400_000);
}

export function createDefaultQuests(): QuestData[] {
  return [
    {
      questID: 'daily_win_2v2_3',
      title: 'Synergie de Duo',
      description: 'Gagner 3 matchs en 2v2',
      category: 'Daily',
      targetValue: 3,
      currentProgress: 0,
      rewardArenaPoints: 300,
      rewardPrestigeTokens: 60,
      isCompleted: false,
    },
    {
      questID: 'daily_damage_1500',
      title: 'Pression Continue',
      description: 'Infliger 1 500 points de dégâts en arène',
      category: 'Daily',
      targetValue: 1500,
      currentProgress: 0,
      rewardArenaPoints: 200,
      rewardPrestigeTokens: 40,
      isCompleted: false,
    },
    {
      questID: 'mastery_zero_sum_flawless',
      title: 'Maîtrise Zero Sum',
      description: 'Gagner un round complet sans subir un seul point de dégât',
      category: 'Mastery',
      targetValue: 1,
      currentProgress: 0,
      rewardArenaPoints: 500,
      rewardPrestigeTokens: 250,
      isCompleted: false,
    },
  ];
}

export const MAX_MMR_HISTORY_SESSIONS = 10;

export function createDefaultMmrHistory(
  anchorMMR: number = 1240,
  nowMs: number = Date.now()
): MmrSessionEntry[] {
  const deltas: Array<{ delta: number; mode: ArenaMode }> = [
    { delta: 16.4, mode: '1v1' },
    { delta: -14.2, mode: '2v2' },
    { delta: 18.0, mode: '2v2' },
    { delta: 15.6, mode: '2v2' },
    { delta: -17.5, mode: '4v4' },
    { delta: 19.2, mode: '2v2' },
    { delta: -13.8, mode: '1v1' },
    { delta: 16.5, mode: '2v2' },
    { delta: 14.8, mode: '4v4' },
    { delta: 15.0, mode: '2v2' },
  ];

  const totalShift = deltas.reduce((sum, item) => sum + item.delta, 0);
  let runningMMR = Math.max(
    MIN_FLOOR_MMR,
    Math.round((anchorMMR - totalShift) * 10) / 10
  );

  return deltas.map((item, idx) => {
    runningMMR = Math.max(
      MIN_FLOOR_MMR,
      Math.round((runningMMR + item.delta) * 10) / 10
    );
    const isLast = idx === deltas.length - 1;
    const finalMMR = isLast ? Math.round(anchorMMR * 10) / 10 : runningMMR;
    return {
      sessionIndex: idx + 1,
      label: `S${idx + 1}`,
      mmr: finalMMR,
      delta: item.delta,
      mode: item.mode,
      result: item.delta >= 0 ? 'win' : 'loss',
      rankName: getRankFromMMR(finalMMR).name,
      timestamp: nowMs - (deltas.length - idx) * 3_600_000,
    };
  });
}

export function appendMmrSession(
  history: MmrSessionEntry[],
  entry: Omit<MmrSessionEntry, 'sessionIndex' | 'label'>,
  maxEntries: number = MAX_MMR_HISTORY_SESSIONS
): MmrSessionEntry[] {
  const lastIndex =
    history.length > 0 ? history[history.length - 1].sessionIndex : 0;
  const nextIndex = lastIndex + 1;
  const nextEntry: MmrSessionEntry = {
    ...entry,
    sessionIndex: nextIndex,
    label: `S${nextIndex}`,
  };
  const combined = [...history, nextEntry];
  if (combined.length <= maxEntries) {
    return combined;
  }
  return combined.slice(combined.length - maxEntries);
}

export function getMmrHistoryStats(history: MmrSessionEntry[]): MmrHistoryStats {
  if (history.length === 0) {
    return {
      count: 0,
      startMMR: 1200,
      currentMMR: 1200,
      netDelta: 0,
      peakMMR: 1200,
      winRatePct: 0,
    };
  }
  const startMMR = history[0].mmr;
  const currentMMR = history[history.length - 1].mmr;
  const netDelta = Math.round((currentMMR - startMMR) * 10) / 10;
  const peakMMR = Math.max(...history.map((h) => h.mmr));
  const wins = history.filter((h) => h.result === 'win').length;
  const winRatePct = Math.round((wins / history.length) * 100);
  return {
    count: history.length,
    startMMR,
    currentMMR,
    netDelta,
    peakMMR,
    winRatePct,
  };
}

export function createDefaultProfile(dayIndex: number = getCurrentDayIndex()): PlayerProfile {
  return {
    version: 1,
    displayName: 'Commandant',
    mmr: 1240,
    rankTier: getRankFromMMR(1240).tier,
    highestRankTier: getRankFromMMR(1240).tier,
    totalWins: 7,
    totalMatches: 10,
    arenaPoints: 550,
    prestigeTokens: 420,
    lastFirstWinDayIndex: -1,
    lastDailyResetDayIndex: dayIndex,
    activeQuests: createDefaultQuests(),
    unlockedPerks: [],
    unlockedTitles: [],
    equippedTitle: '',
    unlockedDarkMode: false,
    uiTheme: 'LightMode',
    mmrHistory: createDefaultMmrHistory(1240),
  };
}

export function refreshDailyQuestsIfNeeded(
  profile: PlayerProfile,
  dayIndex: number = getCurrentDayIndex()
): PlayerProfile {
  if (profile.lastDailyResetDayIndex === dayIndex) {
    return profile;
  }
  const keptMastery = profile.activeQuests.filter((q) => q.category === 'Mastery');
  const freshDefaults = createDefaultQuests();
  const freshDailies = freshDefaults.filter((q) => q.category === 'Daily');
  const masteryQuests =
    keptMastery.length > 0
      ? keptMastery
      : freshDefaults.filter((q) => q.category === 'Mastery');

  return {
    ...profile,
    lastDailyResetDayIndex: dayIndex,
    activeQuests: [...freshDailies, ...masteryQuests],
  };
}

export function calculateTeamAverageMMR(mmrs: number[]): number {
  if (mmrs.length === 0) return 1200;
  const total = mmrs.reduce((acc, value) => acc + value, 0);
  return total / mmrs.length;
}

export function calculateZeroSumTransfer(
  teamAMMRs: number[],
  teamBMMRs: number[],
  teamAWon: boolean
): EloTransferResult {
  const teamAAvgMMR = calculateTeamAverageMMR(teamAMMRs);
  const teamBAvgMMR = calculateTeamAverageMMR(teamBMMRs);
  const expectedTeamAWin = 1 / (1 + Math.pow(10, (teamBAvgMMR - teamAAvgMMR) / 400));
  const actualA = teamAWon ? 1 : 0;
  const rawDelta = Math.abs(ZERO_SUM_K_FACTOR * (actualA - expectedTeamAWin));
  const roundedDelta = Math.max(1, Math.round(rawDelta * 10) / 10);

  return {
    teamAAvgMMR: Math.round(teamAAvgMMR * 10) / 10,
    teamBAvgMMR: Math.round(teamBAvgMMR * 10) / 10,
    expectedTeamAWin,
    deltaPerWinner: roundedDelta,
    deltaPerLoser: -roundedDelta,
  };
}

export function getRankFromMMR(mmr: number): RankTierInfo {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (mmr >= RANK_TIERS[i].minMMR) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

export function getRankUpPrestigeBonus(newTier: number): number {
  switch (newTier) {
    case 2:
      return 100;
    case 3:
      return 200;
    case 4:
      return 400;
    case 5:
      return 750;
    case 6:
      return 1500;
    default:
      return 0;
  }
}

export function applyMatchOutcome(
  profile: PlayerProfile,
  input: MatchOutcomeInput
): MatchResolutionSummary {
  const synced = refreshDailyQuestsIfNeeded(profile, input.dayIndex);
  const eloTransfer = calculateZeroSumTransfer(
    input.teamAMMRs,
    input.teamBMMRs,
    input.didWin
  );
  const playerMMRDelta = input.didWin
    ? eloTransfer.deltaPerWinner
    : eloTransfer.deltaPerLoser;

  const nextMMR = Math.max(
    MIN_FLOOR_MMR,
    Math.round((synced.mmr + playerMMRDelta) * 10) / 10
  );
  const previousRankTier = synced.rankTier;
  const newRankInfo = getRankFromMMR(nextMMR);

  let rankUpPrestigeBonus = 0;
  let nextHighestRankTier = synced.highestRankTier;
  if (newRankInfo.tier > synced.highestRankTier) {
    nextHighestRankTier = newRankInfo.tier;
    rankUpPrestigeBonus = getRankUpPrestigeBonus(newRankInfo.tier);
  }

  const baseArenaPoints = input.didWin ? 220 : 90;
  const firstWinBonusApplied =
    input.didWin && synced.lastFirstWinDayIndex !== input.dayIndex;
  let arenaPointsEarned = firstWinBonusApplied
    ? baseArenaPoints * 2
    : baseArenaPoints;
  let prestigeTokensEarned = rankUpPrestigeBonus;
  const nextFirstWinDayIndex = firstWinBonusApplied
    ? input.dayIndex
    : synced.lastFirstWinDayIndex;

  const flawlessZeroSum = input.didWin && input.damageTaken <= 0;
  const completedQuests: QuestData[] = [];
  const roundedDamageDealt = Math.max(0, Math.floor(input.damageDealt));

  const updatedQuests = synced.activeQuests.map((q) => {
    if (q.isCompleted) return q;

    let nextProgress = q.currentProgress;
    if (q.questID === 'daily_win_2v2_3' && input.didWin && input.mode === '2v2') {
      nextProgress = Math.min(q.targetValue, q.currentProgress + 1);
    } else if (q.questID === 'daily_damage_1500' && roundedDamageDealt > 0) {
      nextProgress = Math.min(q.targetValue, q.currentProgress + roundedDamageDealt);
    } else if (q.questID === 'mastery_zero_sum_flawless' && flawlessZeroSum) {
      nextProgress = q.targetValue;
    }

    const completedNow = nextProgress >= q.targetValue;
    const updatedQuest: QuestData = {
      ...q,
      currentProgress: nextProgress,
      isCompleted: completedNow,
    };

    if (completedNow) {
      arenaPointsEarned += q.rewardArenaPoints;
      prestigeTokensEarned += q.rewardPrestigeTokens;
      completedQuests.push(updatedQuest);
    }
    return updatedQuest;
  });

  const baseHistory =
    Array.isArray(synced.mmrHistory) && synced.mmrHistory.length > 0
      ? synced.mmrHistory
      : createDefaultMmrHistory(synced.mmr);

  const updatedHistory = appendMmrSession(baseHistory, {
    mmr: nextMMR,
    delta: playerMMRDelta,
    mode: input.mode,
    result: input.didWin ? 'win' : 'loss',
    rankName: newRankInfo.name,
    timestamp: Date.now(),
  });

  const updatedProfile: PlayerProfile = {
    ...synced,
    mmr: nextMMR,
    rankTier: newRankInfo.tier,
    highestRankTier: nextHighestRankTier,
    totalWins: synced.totalWins + (input.didWin ? 1 : 0),
    totalMatches: synced.totalMatches + 1,
    arenaPoints: synced.arenaPoints + arenaPointsEarned,
    prestigeTokens: synced.prestigeTokens + prestigeTokensEarned,
    lastFirstWinDayIndex: nextFirstWinDayIndex,
    activeQuests: updatedQuests,
    mmrHistory: updatedHistory,
  };

  return {
    updatedProfile,
    eloTransfer,
    playerMMRDelta,
    previousRankTier,
    newRankTier: newRankInfo.tier,
    rankUpPrestigeBonus,
    baseArenaPoints,
    firstWinBonusApplied,
    arenaPointsEarned,
    prestigeTokensEarned,
    completedQuests,
    flawlessZeroSum,
  };
}

export function tryPurchaseDraftItem(
  profile: PlayerProfile,
  purchasedItemIDs: string[],
  itemID: string
): { ok: boolean; profile: PlayerProfile; purchasedItemIDs: string[]; error?: string } {
  const item = DRAFT_CATALOG.find((i) => i.itemID === itemID);
  if (!item) {
    return { ok: false, profile, purchasedItemIDs, error: 'Article introuvable.' };
  }
  if (purchasedItemIDs.includes(itemID)) {
    return { ok: false, profile, purchasedItemIDs, error: 'Déjà équipé pour ce round.' };
  }
  if (profile.arenaPoints < item.costArenaPoints) {
    return {
      ok: false,
      profile,
      purchasedItemIDs,
      error: `Arena Points insuffisants (${item.costArenaPoints} AP requis).`,
    };
  }
  return {
    ok: true,
    profile: {
      ...profile,
      arenaPoints: profile.arenaPoints - item.costArenaPoints,
    },
    purchasedItemIDs: [...purchasedItemIDs, itemID],
  };
}

export function tryPurchasePrestigeItem(
  profile: PlayerProfile,
  itemID: string
): { ok: boolean; profile: PlayerProfile; error?: string } {
  const item = PRESTIGE_CATALOG.find((i) => i.itemID === itemID);
  if (!item) {
    return { ok: false, profile, error: 'Cosmétique introuvable.' };
  }
  if (item.kind === 'Theme' && profile.unlockedDarkMode) {
    return { ok: false, profile, error: 'Dark Mode déjà débloqué.' };
  }
  if (item.kind === 'Title' && profile.unlockedTitles.includes(item.displayName)) {
    return {
      ok: true,
      profile: {
        ...profile,
        equippedTitle: item.displayName,
      },
    };
  }
  if (profile.prestigeTokens < item.costPrestigeTokens) {
    return {
      ok: false,
      profile,
      error: `Prestige Tokens insuffisants (${item.costPrestigeTokens} PT requis).`,
    };
  }

  if (item.kind === 'Theme') {
    return {
      ok: true,
      profile: {
        ...profile,
        prestigeTokens: profile.prestigeTokens - item.costPrestigeTokens,
        unlockedDarkMode: true,
        uiTheme: 'DarkMode',
      },
    };
  }

  return {
    ok: true,
    profile: {
      ...profile,
      prestigeTokens: profile.prestigeTokens - item.costPrestigeTokens,
      unlockedTitles: [...profile.unlockedTitles, item.displayName],
      equippedTitle: item.displayName,
    },
  };
}

export function tryToggleUITheme(profile: PlayerProfile): {
  ok: boolean;
  profile: PlayerProfile;
  error?: string;
} {
  if (!profile.unlockedDarkMode) {
    return {
      ok: false,
      profile,
      error: 'Débloquez le Dark Mode dans la Boutique de Prestige (2 500 PT).',
    };
  }
  return {
    ok: true,
    profile: {
      ...profile,
      uiTheme: profile.uiTheme === 'DarkMode' ? 'LightMode' : 'DarkMode',
    },
  };
}

export function generateMatchRoster(
  mode: ArenaMode,
  profile: PlayerProfile
): RosterMember[] {
  const teamSize = mode === '1v1' ? 1 : mode === '2v2' ? 2 : 4;
  const allyTemplates: Array<{
    name: string;
    archetype: Archetype;
    items: string[];
    mmrOffset: number;
    title?: string;
  }> = [
    {
      name: 'Lyra',
      archetype: 'Support',
      items: ['aura_mending_pulse', 'perk_overcharge_ult'],
      mmrOffset: 35,
      title: 'Le Fier',
    },
    {
      name: 'Kaelen',
      archetype: 'Tank',
      items: ['aura_aegis_shield', 'wpn_breach_shotgun'],
      mmrOffset: -20,
    },
    {
      name: 'Sora',
      archetype: 'DPS',
      items: ['wpn_pulse_carbine', 'perk_blink_dash'],
      mmrOffset: 15,
    },
  ];

  const enemyTemplates: Array<{
    name: string;
    archetype: Archetype;
    items: string[];
    mmrOffset: number;
    title?: string;
  }> = [
    {
      name: 'Vex',
      archetype: 'DPS',
      items: ['wpn_pulse_carbine'],
      mmrOffset: 18,
    },
    {
      name: 'Bastion',
      archetype: 'Tank',
      items: ['wpn_breach_shotgun', 'aura_aegis_shield'],
      mmrOffset: -12,
      title: 'Zéro Absolu',
    },
    {
      name: 'Nyx',
      archetype: 'Support',
      items: ['aura_mending_pulse'],
      mmrOffset: 42,
    },
    {
      name: 'Orin',
      archetype: 'DPS',
      items: ['perk_blink_dash', 'wpn_pulse_carbine'],
      mmrOffset: -25,
    },
  ];

  const roster: RosterMember[] = [
    {
      id: 'player_human',
      name: profile.displayName,
      isHuman: true,
      team: 'A',
      mmr: profile.mmr,
      rankName: getRankFromMMR(profile.mmr).name,
      title: profile.equippedTitle || undefined,
      archetype: 'DPS',
      purchasedItemIDs: [],
      isReady: false,
    },
  ];

  for (let i = 1; i < teamSize; i++) {
    const tpl = allyTemplates[(i - 1) % allyTemplates.length];
    const mmr = Math.max(MIN_FLOOR_MMR, Math.round(profile.mmr + tpl.mmrOffset));
    roster.push({
      id: `ally_${i}`,
      name: tpl.name,
      isHuman: false,
      team: 'A',
      mmr,
      rankName: getRankFromMMR(mmr).name,
      title: tpl.title,
      archetype: tpl.archetype,
      purchasedItemIDs: tpl.items,
      isReady: true,
    });
  }

  for (let i = 0; i < teamSize; i++) {
    const tpl = enemyTemplates[i % enemyTemplates.length];
    const mmr = Math.max(MIN_FLOOR_MMR, Math.round(profile.mmr + tpl.mmrOffset));
    roster.push({
      id: `enemy_${i}`,
      name: tpl.name,
      isHuman: false,
      team: 'B',
      mmr,
      rankName: getRankFromMMR(mmr).name,
      title: tpl.title,
      archetype: tpl.archetype,
      purchasedItemIDs: tpl.items,
      isReady: true,
    });
  }

  return roster;
}
