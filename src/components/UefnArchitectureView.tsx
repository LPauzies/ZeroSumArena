import React, { useState } from 'react';
import { ARENA_HEIGHT, ARENA_WIDTH, getArenaPillars } from '../engine/arenaCombatEngine';
import { ArenaMode } from '../engine/zeroSumRules';
import { Check } from 'lucide-react';

const DEVICE_BINDINGS = [
  {
    property: 'LobbyTeleporter',
    device: 'teleporter_device',
    qty: '1',
    role: 'Ramène tous les joueurs au Lobby en fin de State_Resolution',
  },
  {
    property: 'Arena1v1TeamA / TeamB',
    device: 'teleporter_device[]',
    qty: '2',
    role: 'Téléportation symétrique dans l’arène 1v1 Alpha (24m × 24m)',
  },
  {
    property: 'Arena2v2TeamA / TeamB',
    device: 'teleporter_device[]',
    qty: '4',
    role: 'Téléportation dans l’arène 2v2 Gamma (38m × 38m)',
  },
  {
    property: 'Arena4v4TeamA / TeamB',
    device: 'teleporter_device[]',
    qty: '8',
    role: 'Téléportation dans l’arène 4v4 Beta (56m × 56m)',
  },
  {
    property: 'ArchetypeClassSelectors',
    device: 'class_and_team_selector_device[]',
    qty: '3',
    role: 'Index 0 = DPS · Index 1 = Tank · Index 2 = Support',
  },
  {
    property: 'DraftItemGranters',
    device: 'item_granter_device[]',
    qty: '6',
    role: 'Octroie armes, auras et perks achetés durant State_ShopPhase',
  },
  {
    property: 'PhaseAnnouncementHUD',
    device: 'hud_message_device',
    qty: '1',
    role: 'Annonces minimalistes lors des transitions de la machine à états',
  },
  {
    property: 'PrestigeShopTriggerButton',
    device: 'button_device',
    qty: '1',
    role: 'Borne interactive ouvrant prestige_shop_ui dans le Lobby',
  },
];

const ROADMAP_PHASES = [
  {
    phase: 'Phase 1 · Core Backend & MVP 1v1',
    items: [
      'Plan greybox Arène 1v1 Alpha (2 piliers symétriques)',
      'Classe player_profile <final><persistable> & weak_map UEFN',
      'Boucle State_Initialization → Combat → Wipe → Respawn',
    ],
  },
  {
    phase: 'Phase 2 · Draft, Économie & Classes',
    items: [
      'UI Boutique de Draft en Verse Canvas (draft_shop_ui.verse)',
      '3 archétypes DPS / Tank / Support reliés aux Class Designers',
      'Liaison des achats Arena Points aux Item Granter Devices',
    ],
  },
  {
    phase: 'Phase 3 · Multijoueur, Ladder & Synergie',
    items: [
      'Routage dynamique 2v2 Gamma & 4v4 Beta avec lignes de vue',
      'Party HUD ancré à gauche (PV alliés + cooldown Ultime)',
      'Algorithme Zero Sum ELO par moyenne d’équipe (Fer → Hexproof)',
    ],
  },
  {
    phase: 'Phase 4 · Rétention & Polish (LiveOps)',
    items: [
      'QuestManager asynchrone Pub/Sub (FWOTD, Quotidiennes, Maîtrise)',
      'Boutique de Prestige (Titres « Le Fier ») & Dark Mode UI',
      'Tests unitaires automatisés + Simulateur interactif de validation',
    ],
  },
];

export const UefnArchitectureView: React.FC = () => {
  const [selectedArena, setSelectedArena] = useState<ArenaMode>('2v2');
  const pillars = getArenaPillars(selectedArena);
  const teamCount = selectedArena === '1v1' ? 1 : selectedArena === '2v2' ? 2 : 4;

  const arenaMeta =
    selectedArena === '1v1'
      ? {
          name: 'Arène 1v1 Alpha',
          dimensions: '24m × 24m (5 × 5 tuiles Fortnite)',
          los: '2 piliers centraux symétriques pour duel pur sans angle mort',
        }
      : selectedArena === '2v2'
        ? {
            name: 'Arène 2v2 Gamma',
            dimensions: '38m × 38m (8 × 8 tuiles Fortnite)',
            los: '4 piliers de ligne de vue favorisant le kiting et les auras de soin',
          }
        : {
            name: 'Arène 4v4 Beta',
            dimensions: '56m × 56m (11 × 11 tuiles Fortnite)',
            los: '5 couvertures structurées + pilier central pour combats d’équipe coordonnés',
          };

  return (
    <div className="space-y-6">
      {/* Greybox Arena Blueprint */}
      <section className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
              Plans Greybox des Arènes UEFN
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {arenaMeta.name} · {arenaMeta.dimensions} · {arenaMeta.los}
            </p>
          </div>

          <div className="flex items-center border border-neutral-200 dark:border-neutral-800">
            {(['1v1', '2v2', '4v4'] as ArenaMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedArena(m)}
                className={`px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedArena === m
                    ? 'bg-neutral-950 text-white dark:bg-neutral-100 dark:text-neutral-950'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100'
                }`}
              >
                {m === '1v1' ? '1v1 Alpha' : m === '2v2' ? '2v2 Gamma' : '4v4 Beta'}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4">
          <svg
            viewBox={`0 0 ${ARENA_WIDTH} ${ARENA_HEIGHT}`}
            className="w-full h-auto max-h-[360px]"
            role="img"
            aria-label={`Plan architectural ${arenaMeta.name}`}
          >
            {/* Outer bounds */}
            <rect
              x={12}
              y={12}
              width={ARENA_WIDTH - 24}
              height={ARENA_HEIGHT - 24}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeWidth={2}
            />
            {/* Symmetry axis */}
            <line
              x1={ARENA_WIDTH / 2}
              y1={12}
              x2={ARENA_WIDTH / 2}
              y2={ARENA_HEIGHT - 12}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeDasharray="6 6"
            />
            <circle
              cx={ARENA_WIDTH / 2}
              cy={ARENA_HEIGHT / 2}
              r={64}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.2}
            />

            {/* Pillars */}
            {pillars.map((p, i) => (
              <g key={i}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  fill="currentColor"
                  fillOpacity={0.09}
                  stroke="currentColor"
                  strokeOpacity={0.55}
                  strokeWidth={1.5}
                />
                <line
                  x1={p.x}
                  y1={p.y}
                  x2={p.x + p.w}
                  y2={p.y + p.h}
                  stroke="currentColor"
                  strokeOpacity={0.2}
                />
              </g>
            ))}

            {/* Team A Teleporters */}
            {Array.from({ length: teamCount }).map((_, idx) => {
              const y = (ARENA_HEIGHT / (teamCount + 1)) * (idx + 1);
              return (
                <g key={`a-${idx}`}>
                  <circle cx={115} cy={y} r={14} fill="#16A34A" fillOpacity={0.85} />
                  <text
                    x={115}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#FFFFFF"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    A{idx + 1}
                  </text>
                </g>
              );
            })}

            {/* Team B Teleporters */}
            {Array.from({ length: teamCount }).map((_, idx) => {
              const y = (ARENA_HEIGHT / (teamCount + 1)) * (idx + 1);
              return (
                <g key={`b-${idx}`}>
                  <circle
                    cx={ARENA_WIDTH - 115}
                    cy={y}
                    r={14}
                    fill="#DC2626"
                    fillOpacity={0.85}
                  />
                  <text
                    x={ARENA_WIDTH - 115}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#FFFFFF"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    B{idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* @editable Devices Table */}
      <section className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
            Câblage des Devices UEFN (@editable sur zero_sum_game_manager)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Reliez ces devices dans l’Outliner Unreal Editor for Fortnite après compilation des scripts Verse.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-500 dark:text-neutral-400">
                <th className="py-3 px-4 font-medium">Propriété Verse</th>
                <th className="py-3 px-4 font-medium">Device UEFN</th>
                <th className="py-3 px-4 font-medium text-right">Qté</th>
                <th className="py-3 px-4 font-medium">Rôle dans la boucle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {DEVICE_BINDINGS.map((row) => (
                <tr
                  key={row.property}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                >
                  <td className="py-3 px-4 font-mono font-medium text-neutral-950 dark:text-neutral-100 whitespace-nowrap">
                    {row.property}
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    {row.device}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-neutral-900 dark:text-neutral-100">
                    {row.qty}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                    {row.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Roadmap Implementation Coverage */}
      <section className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
            Couverture de la Roadmap GDD (Phases 1 à 4)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            L’ensemble des systèmes spécifiés dans le fichier /GDD est implémenté dans /uefn/ZeroSumArena/ et simulé ici.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROADMAP_PHASES.map((block) => (
            <div
              key={block.phase}
              className="border border-neutral-200 dark:border-neutral-800 p-4 space-y-2.5"
            >
              <div className="text-xs font-semibold text-neutral-950 dark:text-neutral-50">
                {block.phase}
              </div>
              <ul className="space-y-1.5">
                {block.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
