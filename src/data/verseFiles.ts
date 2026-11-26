import persistenceModelsRaw from '../../uefn/ZeroSumArena/persistence_models.verse?raw';
import eloSystemRaw from '../../uefn/ZeroSumArena/elo_system.verse?raw';
import economyCatalogRaw from '../../uefn/ZeroSumArena/economy_catalog.verse?raw';
import questManagerRaw from '../../uefn/ZeroSumArena/quest_manager.verse?raw';
import uiThemeRaw from '../../uefn/ZeroSumArena/ui_theme.verse?raw';
import draftShopUiRaw from '../../uefn/ZeroSumArena/draft_shop_ui.verse?raw';
import partyHudUiRaw from '../../uefn/ZeroSumArena/party_hud_ui.verse?raw';
import prestigeShopUiRaw from '../../uefn/ZeroSumArena/prestige_shop_ui.verse?raw';
import gameManagerRaw from '../../uefn/ZeroSumArena/game_manager.verse?raw';
import setupGuideRaw from '../../uefn/ZeroSumArena/UEFN_SETUP_GUIDE.md?raw';

export interface VerseModuleFile {
  id: string;
  filename: string;
  path: string;
  phase: string;
  summary: string;
  gddSection: string;
  language: 'verse' | 'markdown';
  content: string;
}

export const VERSE_FILES: VerseModuleFile[] = [
  {
    id: 'game_manager',
    filename: 'game_manager.verse',
    path: 'uefn/ZeroSumArena/game_manager.verse',
    phase: 'Phase 1 · 3',
    summary:
      'Creative Device principal orchestrant la machine à états (Initialization, ShopPhase, Combat, Resolution), le routage 1v1/2v2/4v4 et les devices Fortnite.',
    gddSection: '4. Architecture Système & State Machine',
    language: 'verse',
    content: gameManagerRaw,
  },
  {
    id: 'persistence_models',
    filename: 'persistence_models.verse',
    path: 'uefn/ZeroSumArena/persistence_models.verse',
    phase: 'Phase 1',
    summary:
      'Modèles immuables <final><persistable> (player_profile, quest_data), weak_map UEFN et réinitialisation quotidienne UTC.',
    gddSection: '3. Architecture des Données (Backend Verse)',
    language: 'verse',
    content: persistenceModelsRaw,
  },
  {
    id: 'elo_system',
    filename: 'elo_system.verse',
    path: 'uefn/ZeroSumArena/elo_system.verse',
    phase: 'Phase 3',
    summary:
      'Algorithme Zero Sum ELO par moyenne d’équipe (1v1, 2v2, 4v4) et paliers de ligues Fer → Bronze → Argent → Or → Diamant → Hexproof.',
    gddSection: '2.A Le Ladder (Système de Ligues ELO)',
    language: 'verse',
    content: eloSystemRaw,
  },
  {
    id: 'economy_catalog',
    filename: 'economy_catalog.verse',
    path: 'uefn/ZeroSumArena/economy_catalog.verse',
    phase: 'Phase 2 · 4',
    summary:
      'Double économie (Arena Points & Prestige Tokens), 3 archétypes Class Designer (DPS, Tank, Support) et catalogues Draft / Prestige.',
    gddSection: '2.B L’Économie Double',
    language: 'verse',
    content: economyCatalogRaw,
  },
  {
    id: 'quest_manager',
    filename: 'quest_manager.verse',
    path: 'uefn/ZeroSumArena/quest_manager.verse',
    phase: 'Phase 4',
    summary:
      'Bus Pub/Sub asynchrone écoutant dégâts et résolutions : First Win of the Day (+100% AP), Quotidiennes et Maîtrise Zero Sum.',
    gddSection: '2.C Le Système de Quêtes (FOMO Positif)',
    language: 'verse',
    content: questManagerRaw,
  },
  {
    id: 'draft_shop_ui',
    filename: 'draft_shop_ui.verse',
    path: 'uefn/ZeroSumArena/draft_shop_ui.verse',
    phase: 'Phase 2 · 3',
    summary:
      'Interface Verse Canvas de la Boutique de Draft avec sélecteur d’archétype et HUD de Synergie temps réel affichant les builds alliés.',
    gddSection: '5. UI / Frontend (Boutique de Draft)',
    language: 'verse',
    content: draftShopUiRaw,
  },
  {
    id: 'party_hud_ui',
    filename: 'party_hud_ui.verse',
    path: 'uefn/ZeroSumArena/party_hud_ui.verse',
    phase: 'Phase 3',
    summary:
      'Party HUD ancré à gauche de l’écran (non-bloquant) affichant PV alliés et cooldown de compétence ultime à 5 Hz.',
    gddSection: '5. UI / Frontend (Party HUD)',
    language: 'verse',
    content: partyHudUiRaw,
  },
  {
    id: 'prestige_shop_ui',
    filename: 'prestige_shop_ui.verse',
    path: 'uefn/ZeroSumArena/prestige_shop_ui.verse',
    phase: 'Phase 4',
    summary:
      'Boutique de Prestige Verse Canvas : consultation des quêtes, achat de titres (« Le Fier ») et déblocage du Dark Mode.',
    gddSection: '5. UI / Frontend (Dark Mode Prestige)',
    language: 'verse',
    content: prestigeShopUiRaw,
  },
  {
    id: 'ui_theme',
    filename: 'ui_theme.verse',
    path: 'uefn/ZeroSumArena/ui_theme.verse',
    phase: 'Phase 4',
    summary:
      'Palettes géométriques SRGB LightMode (par défaut) et DarkMode (Prestige ultime) partagées sur tous les Canvas Verse.',
    gddSection: '1. Direction Artistique (UI)',
    language: 'verse',
    content: uiThemeRaw,
  },
  {
    id: 'setup_guide',
    filename: 'UEFN_SETUP_GUIDE.md',
    path: 'uefn/ZeroSumArena/UEFN_SETUP_GUIDE.md',
    phase: 'Intégration',
    summary:
      'Guide pas-à-pas d’importation dans Unreal Editor for Fortnite, câblage @editable des devices et paramètres d’île.',
    gddSection: '6. Roadmap & Intégration UEFN',
    language: 'markdown',
    content: setupGuideRaw,
  },
];
