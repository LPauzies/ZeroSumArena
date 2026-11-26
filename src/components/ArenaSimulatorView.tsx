import React, { useEffect, useRef, useState } from 'react';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ArenaCombatSimulation,
  CombatFinishResult,
  CombatHudSnapshot,
} from '../engine/arenaCombatEngine';
import {
  ARCHETYPE_SPECS,
  ArenaMode,
  ArenaState,
  Archetype,
  DRAFT_CATALOG,
  MatchResolutionSummary,
  PlayerProfile,
  RosterMember,
  applyMatchOutcome,
  calculateTeamAverageMMR,
  generateMatchRoster,
  getCurrentDayIndex,
  getRankFromMMR,
  tryPurchaseDraftItem,
} from '../engine/zeroSumRules';
import { MmrHistoryChart } from './MmrHistoryChart';
import { Check, Play, RotateCcw, Shield, Swords, Zap } from 'lucide-react';

interface ArenaSimulatorViewProps {
  profile: PlayerProfile;
  onProfileChange: (next: PlayerProfile) => void;
  autostart?: boolean;
}

const STATE_STEPS: Array<{ id: ArenaState; label: string; verseName: string }> = [
  { id: 'State_Initialization', label: '01. Initialisation', verseName: 'State_Initialization' },
  { id: 'State_ShopPhase', label: '02. Draft & Synergie', verseName: 'State_ShopPhase' },
  { id: 'State_Combat', label: '03. Combat en Arène', verseName: 'State_Combat' },
  { id: 'State_Resolution', label: '04. Résolution ELO', verseName: 'State_Resolution' },
];

export const ArenaSimulatorView: React.FC<ArenaSimulatorViewProps> = ({
  profile,
  onProfileChange,
  autostart = false,
}) => {
  const [arenaState, setArenaState] = useState<ArenaState>(
    autostart ? 'State_ShopPhase' : 'State_Initialization'
  );
  const [mode, setMode] = useState<ArenaMode>('2v2');
  const [roster, setRoster] = useState<RosterMember[]>(() =>
    generateMatchRoster('2v2', profile)
  );
  const [shopFeedback, setShopFeedback] = useState<string>('');
  const [hudSnapshot, setHudSnapshot] = useState<CombatHudSnapshot | null>(null);
  const [resolution, setResolution] = useState<MatchResolutionSummary | null>(null);
  const [lastDuration, setLastDuration] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<ArenaCombatSimulation | null>(null);
  const profileRef = useRef(profile);
  const rosterRef = useRef(roster);
  const modeRef = useRef(mode);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    rosterRef.current = roster;
  }, [roster]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    document.body.dataset.state = arenaState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [arenaState]);

  const humanMember = roster.find((m) => m.isHuman) ?? roster[0];
  const teamA = roster.filter((m) => m.team === 'A');
  const teamB = roster.filter((m) => m.team === 'B');
  const teamAAvg = Math.round(calculateTeamAverageMMR(teamA.map((m) => m.mmr)));
  const teamBAvg = Math.round(calculateTeamAverageMMR(teamB.map((m) => m.mmr)));

  const handleSelectMode = (nextMode: ArenaMode) => {
    setMode(nextMode);
    setRoster(generateMatchRoster(nextMode, profile));
    setShopFeedback('');
  };

  const handleEnterDraft = () => {
    const freshRoster = generateMatchRoster(mode, profile);
    setRoster(freshRoster);
    setResolution(null);
    setShopFeedback('');
    setArenaState('State_ShopPhase');
  };

  const handleSelectArchetype = (archetype: Archetype) => {
    setRoster((prev) =>
      prev.map((m) => (m.isHuman ? { ...m, archetype } : m))
    );
    setShopFeedback(`Archétype ${archetype} assigné (Class Selector #${ARCHETYPE_SPECS[archetype].classSelectorIndex}).`);
  };

  const handleBuyDraftItem = (itemID: string) => {
    const result = tryPurchaseDraftItem(
      profile,
      humanMember.purchasedItemIDs,
      itemID
    );
    if (!result.ok) {
      setShopFeedback(result.error ?? 'Achat impossible.');
      return;
    }
    onProfileChange(result.profile);
    setRoster((prev) =>
      prev.map((m) =>
        m.isHuman ? { ...m, purchasedItemIDs: result.purchasedItemIDs } : m
      )
    );
    const bought = DRAFT_CATALOG.find((i) => i.itemID === itemID);
    setShopFeedback(
      `${bought?.displayName ?? itemID} équipé — partagé en temps réel sur le HUD de Synergie.`
    );
  };

  const handleStartCombat = () => {
    setRoster((prev) => prev.map((m) => ({ ...m, isReady: true })));
    setArenaState('State_Combat');
  };

  const handleCombatComplete = (finish: CombatFinishResult) => {
    const activeRoster = rosterRef.current;
    const teamAMMRs = activeRoster
      .filter((m) => m.team === 'A')
      .map((m) => m.mmr);
    const teamBMMRs = activeRoster
      .filter((m) => m.team === 'B')
      .map((m) => m.mmr);

    const summary = applyMatchOutcome(profileRef.current, {
      mode: modeRef.current,
      teamAMMRs,
      teamBMMRs,
      didWin: finish.didWin,
      damageDealt: finish.damageDealt,
      damageTaken: finish.damageTaken,
      dayIndex: getCurrentDayIndex(),
    });

    onProfileChange(summary.updatedProfile);
    setLastDuration(finish.durationSeconds);
    setResolution(summary);
    setArenaState('State_Resolution');
  };

  // Mount decoupled 60 FPS combat loop strictly during State_Combat
  useEffect(() => {
    if (arenaState !== 'State_Combat') {
      simRef.current = null;
      return;
    }

    const sim = new ArenaCombatSimulation(
      modeRef.current,
      rosterRef.current,
      handleCombatComplete
    );
    simRef.current = sim;
    setHudSnapshot(sim.getHudSnapshot());

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccumulator = 0;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      sim.step(dt);

      if (ctx) {
        const isDark = document.documentElement.classList.contains('dark');
        sim.render(ctx, isDark);
      }

      hudSyncAccumulator += dt;
      if (hudSyncAccumulator >= 0.1) {
        hudSyncAccumulator = 0;
        setHudSnapshot(sim.getHudSnapshot());
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }
      sim.keysHeld.add(e.code);
      if (!e.repeat) {
        if (e.code === 'Space') sim.queueDash();
        if (e.code === 'KeyQ') sim.queueAbility();
        if (e.code === 'KeyR') sim.queueUltimate();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      sim.keysHeld.delete(e.code);
    };

    const onWindowBlur = () => {
      sim.clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      sim.clearInputs();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaState]);

  const updatePointerFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    sim.pointerWorldX = (e.clientX - rect.left) * scaleX;
    sim.pointerWorldY = (e.clientY - rect.top) * scaleY;
  };

  const arenaRouteLabel =
    mode === '1v1'
      ? 'Arène 1v1 Alpha (2 joueurs)'
      : mode === '2v2'
        ? 'Arène 2v2 Gamma (4 joueurs)'
        : 'Arène 4v4 Beta (8 joueurs)';

  const allySynergyTags = teamA
    .filter((m) => !m.isHuman)
    .flatMap((m) =>
      m.purchasedItemIDs.map(
        (id) => DRAFT_CATALOG.find((item) => item.itemID === id)?.synergyTag ?? id
      )
    );

  return (
    <div className="space-y-6">
      {/* State Machine Progress Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {STATE_STEPS.map((step, index) => {
          const isCurrent = arenaState === step.id;
          const stepIndex = STATE_STEPS.findIndex((s) => s.id === arenaState);
          const isDone = index < stepIndex;
          return (
            <div
              key={step.id}
              className={`px-4 py-3 border-b lg:border-b-0 ${
                index < STATE_STEPS.length - 1
                  ? 'lg:border-r border-neutral-200 dark:border-neutral-800'
                  : ''
              } ${
                isCurrent
                  ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <div className="text-xs font-medium tracking-tight">{step.label}</div>
              <div
                className={`text-[11px] font-mono mt-0.5 ${
                  isCurrent
                    ? 'text-neutral-300 dark:text-neutral-700'
                    : isDone
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {isDone ? 'Terminé · ' : ''}
                {step.verseName}
              </div>
            </div>
          );
        })}
      </div>

      {/* STATE 1: INITIALIZATION */}
      {arenaState === 'State_Initialization' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                Sélection du format d’arène & Matchmaking Zero Sum
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1.5 leading-relaxed">
                En phase d’initialisation, <span className="font-mono text-xs">zero_sum_game_manager</span> charge les profils persistants et route les joueurs (2, 4 ou 8) vers l’arène physique dédiée.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Format compétitif
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['1v1', '2v2', '4v4'] as ArenaMode[]).map((option) => {
                  const active = mode === option;
                  const meta =
                    option === '1v1'
                      ? 'Alpha · 2 joueurs'
                      : option === '2v2'
                        ? 'Gamma · 4 joueurs'
                        : 'Beta · 8 joueurs';
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectMode(option)}
                      className={`text-left p-4 border transition-colors cursor-pointer ${
                        active
                          ? 'border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="text-lg font-semibold tabular-nums">{option}</div>
                      <div
                        className={`text-xs mt-1 ${
                          active
                            ? 'text-neutral-300 dark:text-neutral-700'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {meta}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                Routage UEFN actif : <span className="font-medium text-neutral-950 dark:text-neutral-100">{arenaRouteLabel}</span>
              </div>
              <button
                type="button"
                data-start="true"
                onClick={handleEnterDraft}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
                Lancer le Draft
              </button>
            </div>
          </section>

          <section className="lg:col-span-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                Équilibrage SBMM par moyenne d’équipe
              </h3>
              <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                {teamAAvg} vs {teamBAvg} MMR
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                  Équipe A · Moyenne {teamAAvg} MMR
                </div>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800">
                  {teamA.map((m) => (
                    <div
                      key={m.id}
                      className="px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {m.name}
                        {m.title ? ` · ${m.title}` : ''}
                      </span>
                      <span className="font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                        {m.rankName} · {Math.round(m.mmr)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                  Équipe B · Moyenne {teamBAvg} MMR
                </div>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800">
                  {teamB.map((m) => (
                    <div
                      key={m.id}
                      className="px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {m.name}
                        {m.title ? ` · ${m.title}` : ''}
                      </span>
                      <span className="font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                        {m.rankName} · {Math.round(m.mmr)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          </div>

          <MmrHistoryChart history={profile.mmrHistory} />
        </div>
      )}

      {/* STATE 2: DRAFT SHOP PHASE + SYNERGY HUD */}
      {arenaState === 'State_ShopPhase' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Draft Shop Canvas */}
          <section className="lg:col-span-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-3.5">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                  Boutique de Draft
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {arenaRouteLabel} · Sélectionnez votre archétype Class Designer et achetez vos équipements.
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                  Solde disponible
                </div>
                <div className="text-xl font-semibold font-mono tabular-nums text-neutral-950 dark:text-neutral-50 whitespace-nowrap">
                  {profile.arenaPoints} AP
                </div>
              </div>
            </div>

            {/* 3 Starting Archetypes */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Archétype de départ (Class Designer UEFN)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['DPS', 'Tank', 'Support'] as Archetype[]).map((role) => {
                  const spec = ARCHETYPE_SPECS[role];
                  const selected = humanMember.archetype === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleSelectArchetype(role)}
                      className={`text-left p-3 border cursor-pointer ${
                        selected
                          ? 'border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{spec.label}</span>
                        <span
                          className={`text-[11px] font-mono tabular-nums whitespace-nowrap ${
                            selected
                              ? 'text-neutral-300 dark:text-neutral-700'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {spec.maxHealth} PV / {spec.maxShield} SH
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-snug ${
                          selected
                            ? 'text-neutral-300 dark:text-neutral-700'
                            : 'text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {spec.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Draft Items Grid */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Armes, Perks & Auras d’équipe (Item Granter Devices)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {DRAFT_CATALOG.map((item) => {
                  const owned = humanMember.purchasedItemIDs.includes(item.itemID);
                  const canAfford = profile.arenaPoints >= item.costArenaPoints;
                  return (
                    <div
                      key={item.itemID}
                      className="border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                            {item.displayName}
                          </h3>
                          <span className="text-xs font-mono tabular-nums text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            {item.costArenaPoints} AP
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {item.category} · {item.synergyTag} · {item.recommendedRole}
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 leading-snug">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                          Granter #{item.itemGranterIndex}
                        </span>
                        <button
                          type="button"
                          disabled={owned || !canAfford}
                          onClick={() => handleBuyDraftItem(item.itemID)}
                          className={`px-3 py-1 text-xs font-medium whitespace-nowrap ${
                            owned
                              ? 'bg-emerald-600 text-white cursor-default'
                              : canAfford
                                ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer'
                                : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed'
                          }`}
                        >
                          {owned ? 'Équipé' : 'Acheter'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {shopFeedback && (
              <div className="text-xs text-neutral-700 dark:text-neutral-300 border-t border-neutral-200 dark:border-neutral-800 pt-2.5">
                {shopFeedback}
              </div>
            )}
          </section>

          {/* Right: Real-time Ally Synergy HUD + Primary Launch Action */}
          <aside className="lg:col-span-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                HUD de Synergie · Équipe A
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Synchronisé en direct pendant la phase de Draft pour adapter votre build à vos coéquipiers.
              </p>
            </div>

            {allySynergyTags.length > 0 && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                Conseil de synergie : votre équipe dispose déjà de{' '}
                <span className="font-semibold text-neutral-950 dark:text-neutral-100">
                  {allySynergyTags.slice(0, 2).join(' et ')}
                </span>
                . Un archétype{' '}
                <span className="font-semibold text-neutral-950 dark:text-neutral-100">
                  {teamA.some((m) => !m.isHuman && m.archetype === 'Support')
                    ? 'Tank ou DPS'
                    : 'Support'}
                </span>{' '}
                complète idéalement la composition.
              </div>
            )}

            <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-b border-neutral-200 dark:border-neutral-800">
              {teamA.map((member) => {
                const items = member.purchasedItemIDs
                  .map((id) => DRAFT_CATALOG.find((i) => i.itemID === id))
                  .filter(Boolean);
                return (
                  <div key={member.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-neutral-950 dark:text-neutral-50">
                        {member.name}
                        {member.isHuman ? ' (Vous)' : ''}
                      </span>
                      <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        {member.archetype}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {items.length > 0
                        ? items.map((i) => `${i!.displayName} (${i!.synergyTag})`).join(' · ')
                        : 'Aucun équipement acheté'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleStartCombat}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Swords className="w-4 h-4" />
                Prêt pour le Combat
              </button>
              <button
                type="button"
                onClick={() => setArenaState('State_Initialization')}
                className="w-full px-4 py-2 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Retour au choix d’arène
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* STATE 3: COMBAT ARENA + LEFT PARTY HUD */}
      {arenaState === 'State_Combat' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-950 dark:text-neutral-50">
                {arenaRouteLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Équipe A {hudSnapshot?.teamAAlive ?? teamA.length} — {hudSnapshot?.teamBAlive ?? teamB.length} Équipe B
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Dégâts subis : {hudSnapshot?.playerDamageTaken ?? 0}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => simRef.current?.forceResolve(true)}
                className="px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                Simuler Victoire
              </button>
              <button
                type="button"
                onClick={() => simRef.current?.forceResolve(false)}
                className="px-3 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                Simuler Défaite
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left-Side Party HUD (mirrors party_hud_ui.verse) */}
            <aside
              data-testid="party-hud"
              className="lg:col-span-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-4"
            >
              <div className="flex items-baseline justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
                <h3 className="text-xs font-semibold text-neutral-950 dark:text-neutral-50">
                  Party HUD · Alliés
                </h3>
                <span className="text-[11px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                  {(hudSnapshot?.elapsedSeconds ?? 0).toFixed(1)}s
                </span>
              </div>

              <div className="space-y-3.5">
                {(hudSnapshot?.allies ?? []).map((ally) => {
                  const hpPct = Math.max(0, Math.min(100, (ally.hp / ally.maxHp) * 100));
                  const shieldPct =
                    ally.maxShield > 0
                      ? Math.max(0, Math.min(100, (ally.shield / ally.maxShield) * 100))
                      : 0;
                  const ultReady = ally.ultCooldown <= 0.05;
                  return (
                    <div
                      key={ally.id}
                      className={`space-y-1.5 ${!ally.alive ? 'opacity-45' : ''}`}
                    >
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-semibold text-neutral-950 dark:text-neutral-50">
                          {ally.name}
                          {ally.isHuman ? ' · Vous' : ''}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                          {ally.archetype}
                        </span>
                      </div>

                      {/* HP Bar */}
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            hpPct <= 30 ? 'bg-red-600' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>

                      {/* Shield Bar */}
                      <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-100"
                          style={{ width: `${shieldPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {ally.alive ? `${ally.hp}/${ally.maxHp} PV` : 'Éliminé'}
                        </span>
                        <span
                          className={
                            ultReady
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }
                        >
                          {ultReady
                            ? 'Ultime PRÊT'
                            : `Ultime ${Math.ceil(ally.ultCooldown)}s`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Controls & Cooldowns */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  Compétences ({humanMember.archetype})
                </div>
                <div className="space-y-1.5 text-[11px] font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                  <div className="flex justify-between">
                    <span>Esquive [Espace]</span>
                    <span>
                      {(hudSnapshot?.dashCooldown ?? 0) <= 0.05
                        ? 'PRÊT'
                        : `${(hudSnapshot?.dashCooldown ?? 0).toFixed(1)}s`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{ARCHETYPE_SPECS[humanMember.archetype].abilityName}</span>
                    <span>
                      {(hudSnapshot?.abilityCooldown ?? 0) <= 0.05
                        ? 'PRÊT'
                        : `${(hudSnapshot?.abilityCooldown ?? 0).toFixed(1)}s`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{ARCHETYPE_SPECS[humanMember.archetype].ultimateName}</span>
                    <span>
                      {(hudSnapshot?.ultCooldown ?? 0) <= 0.05
                        ? 'PRÊT'
                        : `${(hudSnapshot?.ultCooldown ?? 0).toFixed(1)}s`}
                    </span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Right: Playable 2D Arena Canvas */}
            <div className="lg:col-span-9 space-y-2">
              <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  data-testid="arena-combat-canvas"
                  width={ARENA_WIDTH}
                  height={ARENA_HEIGHT}
                  onMouseMove={updatePointerFromEvent}
                  onMouseDown={(e) => {
                    updatePointerFromEvent(e);
                    if (e.button === 2) {
                      simRef.current?.queueDash();
                    } else if (simRef.current) {
                      simRef.current.pointerDown = true;
                    }
                  }}
                  onMouseUp={() => {
                    if (simRef.current) simRef.current.pointerDown = false;
                  }}
                  onMouseLeave={() => {
                    if (simRef.current) simRef.current.pointerDown = false;
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className="block w-full h-auto cursor-crosshair select-none"
                />
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center justify-between gap-2">
                <span>
                  WASD / Flèches Déplacement · Clic Gauche Tir · Espace / Clic Droit Esquive · Q Compétence · R Ultime
                </span>
                <span className="font-mono tabular-nums">
                  Dégâts infligés : {hudSnapshot?.playerDamageDealt ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE 4: RESOLUTION (ZERO SUM ELO + QUESTS + PERSISTENCE SAVE) */}
      {arenaState === 'State_Resolution' && resolution && (
        <div className="space-y-6">
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div>
              <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                State_Resolution · Sauvegarde &lt;persistable&gt; confirmée · Durée {lastDuration.toFixed(1)}s
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50 mt-1">
                {resolution.playerMMRDelta > 0 ? 'Victoire de l’Équipe A' : 'Défaite de l’Équipe A'}
              </h2>
            </div>

            <div className="text-right">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Ligue actuelle
              </div>
              <div className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
                {getRankFromMMR(resolution.updatedProfile.mmr).name}{' '}
                <span className="font-mono tabular-nums text-sm text-neutral-500 dark:text-neutral-400">
                  ({Math.round(resolution.updatedProfile.mmr)} MMR)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-neutral-200 dark:border-neutral-800 p-4 space-y-1">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Transfert Zero Sum ELO
              </div>
              <div
                className={`text-2xl font-semibold font-mono tabular-nums ${
                  resolution.playerMMRDelta >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {resolution.playerMMRDelta >= 0 ? '+' : ''}
                {resolution.playerMMRDelta} MMR
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums">
                Gagnants +{resolution.eloTransfer.deltaPerWinner} · Perdants {resolution.eloTransfer.deltaPerLoser} (Somme = 0)
              </div>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 p-4 space-y-1">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Arena Points gagnés
              </div>
              <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-950 dark:text-neutral-50">
                +{resolution.arenaPointsEarned} AP
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {resolution.firstWinBonusApplied
                  ? 'First Win of the Day appliqué (+100%)'
                  : `Récompense de base (${resolution.baseArenaPoints} AP)`}
              </div>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 p-4 space-y-1">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Prestige Tokens gagnés
              </div>
              <div className="text-2xl font-semibold font-mono tabular-nums text-neutral-950 dark:text-neutral-50">
                +{resolution.prestigeTokensEarned} PT
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {resolution.rankUpPrestigeBonus > 0
                  ? `Promotion de ligue (+${resolution.rankUpPrestigeBonus} PT)`
                  : resolution.completedQuests.length > 0
                    ? `${resolution.completedQuests.length} quête(s) validée(s)`
                    : 'Montez de ligue ou complétez une quête'}
              </div>
            </div>
          </div>

          {(resolution.flawlessZeroSum || resolution.completedQuests.length > 0) && (
            <div className="border border-neutral-200 dark:border-neutral-800 p-4 space-y-2 bg-neutral-50 dark:bg-neutral-950">
              <div className="text-xs font-semibold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Événements validés par QuestManager (Pub/Sub)
              </div>
              <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                {resolution.flawlessZeroSum && (
                  <li>
                    Maîtrise Zero Sum atteinte : victoire sans subir le moindre point de dégât.
                  </li>
                )}
                {resolution.completedQuests.map((q) => (
                  <li key={q.questID}>
                    {q.title} — {q.description} (+{q.rewardArenaPoints} AP · +{q.rewardPrestigeTokens} PT)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <Shield className="w-4 h-4" />
              <span>
                Profil persisté : {resolution.updatedProfile.totalWins} victoires / {resolution.updatedProfile.totalMatches} matchs
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleEnterDraft}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5" />
                Relancer un Draft ({mode})
              </button>
              <button
                type="button"
                onClick={() => setArenaState('State_Initialization')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Changer de format
              </button>
            </div>
          </div>
        </div>

        <MmrHistoryChart history={profile.mmrHistory} />
        </div>
      )}
    </div>
  );
};
