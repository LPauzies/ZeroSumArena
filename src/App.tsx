import React, { useEffect, useState } from 'react';
import {
  PlayerProfile,
  createDefaultMmrHistory,
  createDefaultProfile,
  getRankFromMMR,
  refreshDailyQuestsIfNeeded,
} from './engine/zeroSumRules';
import { ArenaSimulatorView } from './components/ArenaSimulatorView';
import { PrestigeQuestsView } from './components/PrestigeQuestsView';
import { VerseCodebaseView } from './components/VerseCodebaseView';
import { UefnArchitectureView } from './components/UefnArchitectureView';
import { Code2, Crown, Layers, Menu, Swords, X } from 'lucide-react';

type ActiveSection = 'arena' | 'prestige' | 'codebase' | 'architecture';

const STORAGE_KEY = 'zero_sum_arena_uefn_profile_v1';

function loadPersistedProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw) as PlayerProfile;
    if (typeof parsed.mmr === 'number' && Array.isArray(parsed.activeQuests)) {
      const hydrated: PlayerProfile = {
        ...parsed,
        mmrHistory:
          Array.isArray(parsed.mmrHistory) && parsed.mmrHistory.length > 0
            ? parsed.mmrHistory
            : createDefaultMmrHistory(parsed.mmr),
      };
      return refreshDailyQuestsIfNeeded(hydrated);
    }
    return createDefaultProfile();
  } catch {
    return createDefaultProfile();
  }
}

const NAV_ITEMS: Array<{
  id: ActiveSection;
  label: string;
  breadcrumb: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'arena',
    label: 'Arène & Simulation',
    breadcrumb: 'Zero Sum Arena / Arène & Simulation',
    icon: Swords,
  },
  {
    id: 'prestige',
    label: 'Prestige & Quêtes',
    breadcrumb: 'Zero Sum Arena / Prestige & Quêtes',
    icon: Crown,
  },
  {
    id: 'codebase',
    label: 'Codebase Verse',
    breadcrumb: 'Zero Sum Arena / Codebase Verse (UEFN)',
    icon: Code2,
  },
  {
    id: 'architecture',
    label: 'Architecture UEFN',
    breadcrumb: 'Zero Sum Arena / Architecture & Devices',
    icon: Layers,
  },
];

export const App: React.FC = () => {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [activeSection, setActiveSection] = useState<ActiveSection>('arena');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(() =>
    loadPersistedProfile()
  );

  // Sync persistence and DarkMode class on <html>
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors in private contexts
    }

    const isDark = profile.unlockedDarkMode && profile.uiTheme === 'DarkMode';
    document.documentElement.classList.toggle('dark', isDark);
  }, [profile]);

  const currentRank = getRankFromMMR(profile.mmr);
  const currentNav =
    NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];

  const handleSelectSection = (id: ActiveSection) => {
    setActiveSection(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="h-14 px-6 flex items-center border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-base font-bold tracking-tight whitespace-nowrap">
            Zero Sum Arena
          </span>
        </div>

        <nav aria-label="Navigation principale" className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-950 dark:hover:text-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
          <div className="font-semibold text-neutral-950 dark:text-neutral-50">
            {profile.displayName}
            {profile.equippedTitle ? ` · ${profile.equippedTitle}` : ''}
          </div>
          <div className="font-mono tabular-nums text-neutral-600 dark:text-neutral-400 space-y-0.5">
            <div>
              {currentRank.name} · {Math.round(profile.mmr)} MMR
            </div>
            <div>
              {profile.arenaPoints} AP · {profile.prestigeTokens} PT
            </div>
            <div>Thème : {profile.uiTheme}</div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-base font-bold tracking-tight">
                Zero Sum Arena
              </span>
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav aria-label="Navigation mobile" className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <button
            type="button"
            aria-label="Fermer l'arrière-plan du menu"
            onClick={() => setMobileNavOpen(false)}
            className="flex-1 bg-black/40"
          />
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-4 lg:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-50 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
              {currentNav.breadcrumb}
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono tabular-nums text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
            <span>{currentRank.name}</span>
            <span aria-hidden="true">·</span>
            <span>{Math.round(profile.mmr)} MMR</span>
            <span aria-hidden="true">·</span>
            <span>{profile.arenaPoints} AP</span>
            <span aria-hidden="true">·</span>
            <span>{profile.prestigeTokens} PT</span>
          </div>

          <button
            type="button"
            onClick={() =>
              handleSelectSection(activeSection === 'codebase' ? 'arena' : 'codebase')
            }
            className="px-3.5 py-1.5 text-xs font-medium bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {activeSection === 'codebase' ? 'Ouvrir le Simulateur' : 'Voir le Code Verse'}
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1280px] w-full mx-auto">
          {activeSection === 'arena' && (
            <ArenaSimulatorView
              profile={profile}
              onProfileChange={setProfile}
              autostart={autostart}
            />
          )}
          {activeSection === 'prestige' && (
            <PrestigeQuestsView profile={profile} onProfileChange={setProfile} />
          )}
          {activeSection === 'codebase' && <VerseCodebaseView />}
          {activeSection === 'architecture' && <UefnArchitectureView />}
        </main>
      </div>
    </div>
  );
};

export default App;
