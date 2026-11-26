import React, { useState } from 'react';
import {
  PRESTIGE_CATALOG,
  PlayerProfile,
  RANK_TIERS,
  createDefaultProfile,
  getCurrentDayIndex,
  getRankFromMMR,
  tryPurchasePrestigeItem,
  tryToggleUITheme,
} from '../engine/zeroSumRules';
import { Moon, RotateCcw, Sun } from 'lucide-react';

interface PrestigeQuestsViewProps {
  profile: PlayerProfile;
  onProfileChange: (next: PlayerProfile) => void;
}

export const PrestigeQuestsView: React.FC<PrestigeQuestsViewProps> = ({
  profile,
  onProfileChange,
}) => {
  const [feedback, setFeedback] = useState<string>('');
  const currentRank = getRankFromMMR(profile.mmr);
  const fwotdAvailable = profile.lastFirstWinDayIndex !== getCurrentDayIndex();

  const handleBuyPrestige = (itemID: string) => {
    const result = tryPurchasePrestigeItem(profile, itemID);
    if (!result.ok) {
      setFeedback(result.error ?? 'Action impossible.');
      return;
    }
    onProfileChange(result.profile);
    const item = PRESTIGE_CATALOG.find((i) => i.itemID === itemID);
    setFeedback(
      item?.kind === 'Theme'
        ? 'Dark Mode débloqué et activé dans player_profile.UITheme.'
        : `Titre « ${item?.displayName} » équipé sur votre profil persistant.`
    );
  };

  const handleToggleTheme = () => {
    const result = tryToggleUITheme(profile);
    if (!result.ok) {
      setFeedback(result.error ?? 'Thème verrouillé.');
      return;
    }
    onProfileChange(result.profile);
    setFeedback(`Thème UI basculé sur ${result.profile.uiTheme}.`);
  };

  const handleGrantSandboxTokens = () => {
    onProfileChange({
      ...profile,
      prestigeTokens: profile.prestigeTokens + 2500,
    });
    setFeedback('+2 500 Prestige Tokens ajoutés pour tester le déblocage du Dark Mode et des Titres.');
  };

  const handleResetProfile = () => {
    onProfileChange(createDefaultProfile());
    setFeedback('Profil <persistable> réinitialisé aux valeurs par défaut.');
  };

  return (
    <div className="space-y-6">
      {/* Ladder Strip (Fer -> Hexproof) */}
      <section className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
              Ladder Compétitif Zero Sum
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Six divisions prestigieuses — le rang Hexproof distingue le Top 1% des joueurs intouchables.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
            Rang actuel : {currentRank.name} · {Math.round(profile.mmr)} MMR
            {profile.equippedTitle ? ` · « ${profile.equippedTitle} »` : ''}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border border-neutral-200 dark:border-neutral-800">
          {RANK_TIERS.map((tier, idx) => {
            const isCurrent = tier.tier === currentRank.tier;
            const isReached = tier.tier <= profile.highestRankTier;
            return (
              <div
                key={tier.tier}
                className={`p-3.5 ${
                  idx < RANK_TIERS.length - 1
                    ? 'border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800'
                    : ''
                } ${
                  isCurrent
                    ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950'
                    : 'bg-white dark:bg-neutral-900'
                }`}
              >
                <div className="text-xs font-mono tabular-nums opacity-65">
                  Palier {tier.tier} · {tier.minMMR}+
                </div>
                <div className="text-sm font-semibold mt-1">{tier.name}</div>
                <div
                  className={`text-[11px] mt-1 ${
                    isCurrent
                      ? 'text-neutral-300 dark:text-neutral-700'
                      : isReached
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {isCurrent ? 'Ligue active' : tier.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quests (FOMO Positif) */}
        <section className="lg:col-span-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
              Quêtes & Rétention (QuestManager)
            </h3>
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
              Pub/Sub
            </span>
          </div>

          <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-neutral-950 dark:text-neutral-50">
                First Win of the Day
              </span>
              <span
                className={`font-mono ${
                  fwotdAvailable
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {fwotdAvailable ? 'Disponible (+100% AP)' : 'Réclamé aujourd’hui'}
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Double les Arena Points gagnés lors de la première victoire quotidienne.
            </p>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
            {profile.activeQuests.map((q) => {
              const pct = Math.min(
                100,
                Math.round((q.currentProgress / q.targetValue) * 100)
              );
              return (
                <div key={q.questID} className="py-4 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                        {q.title}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {q.category === 'Mastery' ? 'Maîtrise' : 'Quotidienne'} · {q.description}
                      </div>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {q.isCompleted ? 'Validée' : `${q.currentProgress} / ${q.targetValue}`}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        q.isCompleted
                          ? 'bg-emerald-600'
                          : 'bg-neutral-900 dark:bg-neutral-200'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="text-[11px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                    Récompense : +{q.rewardArenaPoints} AP · +{q.rewardPrestigeTokens} PT
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Prestige Shop & Dark Mode Unlock */}
        <section className="lg:col-span-7 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                Boutique de Prestige (Cosmétique & Dark Mode)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Aucun Pay-to-Win : les Prestige Tokens débloquent uniquement des titres et le thème sombre de l’interface.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                Prestige Tokens
              </div>
              <div className="text-xl font-semibold font-mono tabular-nums text-neutral-950 dark:text-neutral-50 whitespace-nowrap">
                {profile.prestigeTokens} PT
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {PRESTIGE_CATALOG.map((item) => {
              const isDarkThemeItem = item.kind === 'Theme';
              const isOwned = isDarkThemeItem
                ? profile.unlockedDarkMode
                : profile.unlockedTitles.includes(item.displayName);
              const isEquipped = isDarkThemeItem
                ? profile.uiTheme === 'DarkMode'
                : profile.equippedTitle === item.displayName;
              const canAfford = profile.prestigeTokens >= item.costPrestigeTokens;

              return (
                <div
                  key={item.itemID}
                  className="border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                        {item.displayName}
                      </h4>
                      <span className="text-xs font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                        {item.costPrestigeTokens} PT
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {isDarkThemeItem ? 'Thème UI Verse Canvas' : 'Titre de Profil'}
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                      {isEquipped ? 'Actif' : isOwned ? 'Débloqué' : 'Verrouillé'}
                    </span>

                    {isDarkThemeItem && isOwned ? (
                      <button
                        type="button"
                        onClick={handleToggleTheme}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        {profile.uiTheme === 'DarkMode' ? (
                          <>
                            <Sun className="w-3.5 h-3.5" />
                            Passer en LightMode
                          </>
                        ) : (
                          <>
                            <Moon className="w-3.5 h-3.5" />
                            Activer DarkMode
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!isOwned && !canAfford}
                        onClick={() => handleBuyPrestige(item.itemID)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                          isEquipped
                            ? 'bg-emerald-600 text-white cursor-default'
                            : isOwned || canAfford
                              ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer'
                              : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        {isEquipped
                          ? 'Équipé'
                          : isOwned
                            ? 'Équiper'
                            : 'Débloquer'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {feedback && (
            <div className="text-xs text-neutral-700 dark:text-neutral-300 border-t border-neutral-200 dark:border-neutral-800 pt-3">
              {feedback}
            </div>
          )}

          {/* QA / Persistence Controls */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Outils QA de persistance locale (équivalent weak_map Verse)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGrantSandboxTokens}
                className="px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                +2 500 PT (Test QA)
              </button>
              <button
                type="button"
                onClick={handleResetProfile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser le profil
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
