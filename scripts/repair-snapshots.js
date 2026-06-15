#!/usr/bin/env node
/**
 * repair-snapshots.js — Heals degraded snapshot data using existing standings
 * ───────────────────────────────────────────────────────────────────────
 * Does NOT call any APIs. Uses only data already present in the snapshots.
 *
 * Repairs:
 *   Jun 13 — Rebuild group winProbs from snapshot's own standings
 *            (11 degraded groups had 0% because Polymarket tokens were 0, not undefined)
 *   Jun 14 — Restore scorers from Jun 13, fix standings from Jun 13,
 *            rebuild all group winProbs, restore lost market advanceProbs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const SNAP_DIR = path.join(DATA_DIR, 'snapshots');

const ALL_TEAMS = [
  { id:'mexico', name:'Mexico', group:'A', fifaRank:15 },
  { id:'southafrica', name:'South Africa', group:'A', fifaRank:58 },
  { id:'southkorea', name:'South Korea', group:'A', fifaRank:22 },
  { id:'czechia', name:'Czechia', group:'A', fifaRank:37 },
  { id:'canada', name:'Canada', group:'B', fifaRank:27 },
  { id:'bosnia', name:'Bosnia & Herz.', group:'B', fifaRank:71 },
  { id:'qatar', name:'Qatar', group:'B', fifaRank:51 },
  { id:'switzerland', name:'Switzerland', group:'B', fifaRank:17 },
  { id:'brazil', name:'Brazil', group:'C', fifaRank:4 },
  { id:'morocco', name:'Morocco', group:'C', fifaRank:14 },
  { id:'haiti', name:'Haiti', group:'C', fifaRank:83 },
  { id:'scotland', name:'Scotland', group:'C', fifaRank:39 },
  { id:'usa', name:'USA', group:'D', fifaRank:14 },
  { id:'paraguay', name:'Paraguay', group:'D', fifaRank:39 },
  { id:'australia', name:'Australia', group:'D', fifaRank:26 },
  { id:'turkey', name:'Türkiye', group:'D', fifaRank:25 },
  { id:'germany', name:'Germany', group:'E', fifaRank:9 },
  { id:'curacao', name:'Curaçao', group:'E', fifaRank:82 },
  { id:'ivorycoast', name:'Ivory Coast', group:'E', fifaRank:42 },
  { id:'ecuador', name:'Ecuador', group:'E', fifaRank:23 },
  { id:'netherlands', name:'Netherlands', group:'F', fifaRank:7 },
  { id:'japan', name:'Japan', group:'F', fifaRank:13 },
  { id:'sweden', name:'Sweden', group:'F', fifaRank:29 },
  { id:'tunisia', name:'Tunisia', group:'F', fifaRank:36 },
  { id:'belgium', name:'Belgium', group:'G', fifaRank:9 },
  { id:'egypt', name:'Egypt', group:'G', fifaRank:34 },
  { id:'iran', name:'Iran', group:'G', fifaRank:21 },
  { id:'newzealand', name:'New Zealand', group:'G', fifaRank:86 },
  { id:'spain', name:'Spain', group:'H', fifaRank:1 },
  { id:'capeverde', name:'Cape Verde', group:'H', fifaRank:62 },
  { id:'saudiarabia', name:'Saudi Arabia', group:'H', fifaRank:55 },
  { id:'uruguay', name:'Uruguay', group:'H', fifaRank:18 },
  { id:'france', name:'France', group:'I', fifaRank:3 },
  { id:'senegal', name:'Senegal', group:'I', fifaRank:14 },
  { id:'iraq', name:'Iraq', group:'I', fifaRank:58 },
  { id:'norway', name:'Norway', group:'I', fifaRank:31 },
  { id:'argentina', name:'Argentina', group:'J', fifaRank:2 },
  { id:'algeria', name:'Algeria', group:'J', fifaRank:35 },
  { id:'austria', name:'Austria', group:'J', fifaRank:24 },
  { id:'jordan', name:'Jordan', group:'J', fifaRank:66 },
  { id:'portugal', name:'Portugal', group:'K', fifaRank:6 },
  { id:'drcongo', name:'DR Congo', group:'K', fifaRank:56 },
  { id:'uzbekistan', name:'Uzbekistan', group:'K', fifaRank:50 },
  { id:'colombia', name:'Colombia', group:'K', fifaRank:13 },
  { id:'england', name:'England', group:'L', fifaRank:5 },
  { id:'croatia', name:'Croatia', group:'L', fifaRank:10 },
  { id:'ghana', name:'Ghana', group:'L', fifaRank:60 },
  { id:'panama', name:'Panama', group:'L', fifaRank:76 },
];

function calcProbs(teamId, group, standings) {
  const rows = standings[group] || [];
  const row = rows.find(r => r.teamId === teamId);
  const base = ALL_TEAMS.find(t => t.id === teamId)?.fifaRank ?? 50;
  const hasStandings = rows.length > 0;
  const pos = hasStandings ? (row?.pos ?? 4) : 4;
  const rankScore = Math.max(1, 50 - base);

  let seed;
  if (hasStandings) {
    const posMult = { 1: 1.0, 2: 0.65, 3: 0.3, 4: 0.05 }[pos] ?? 0.5;
    seed = Math.round(rankScore * posMult);
  } else {
    const tiers = [
      { max: 10, pct: 25 }, { max: 20, pct: 18 }, { max: 30, pct: 12 },
      { max: 40, pct: 8 }, { max: 50, pct: 5 }, { max: Infinity, pct: 2 },
    ];
    const tier = tiers.find(t => base <= t.max);
    seed = tier ? Math.round(tier.pct * (rankScore / 50)) : 2;
  }

  return {
    r32: Math.min(Math.round((Math.min(seed, 30)) * 2.8 + (pos <= 2 ? 20 : 5)), 99),
    r16: Math.round(Math.min(Math.round((Math.min(seed, 30)) * 2.8 + (pos <= 2 ? 20 : 5)), 99) * 0.55),
    qf: Math.round(Math.round(Math.min(Math.round((Math.min(seed, 30)) * 2.8 + (pos <= 2 ? 20 : 5)), 99) * 0.55) * 0.52),
    sf: Math.round(Math.round(Math.round(Math.min(Math.round((Math.min(seed, 30)) * 2.8 + (pos <= 2 ? 20 : 5)), 99) * 0.55) * 0.52) * 0.50),
    final: Math.round(Math.round(Math.round(Math.round(Math.min(Math.round((Math.min(seed, 30)) * 2.8 + (pos <= 2 ? 20 : 5)), 99) * 0.55) * 0.52) * 0.50) * 0.50),
    winner: Math.min(seed, 30),
    source: 'calculated',
  };
}

function isDegraded(groupData) {
  if (!groupData?.winProbabilities) return true;
  const total = Object.values(groupData.winProbabilities).reduce((s, v) => s + v, 0);
  return total < 10;
}

function rebuildGroupWinProbs(groupData, groupKey, standings) {
  const winProbs = {};
  for (const row of (groupData.standings || [])) {
    const probs = calcProbs(row.teamId || '', groupKey, standings);
    winProbs[row.teamId] = probs.winner;
  }
  return { ...groupData, winProbabilities: winProbs };
}

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  log('=== Snapshot Repair ===');

  const s13 = loadJSON(path.join(SNAP_DIR, '2026-06-13.json'));
  const s14 = loadJSON(path.join(SNAP_DIR, '2026-06-14.json'));

  // ── Repair Jun 13 ──
  // For each group, extract standings in the format calcProbs expects,
  // then rebuild winProbs.
  log('--- Repairing Jun 13 ---');

  const s13Standings = {};
  for (const g of 'ABCDEFGHIJKL'.split('')) {
    const gd = s13.groups[g];
    if (!gd) continue;
    s13Standings[g] = (gd.standings || []).map(row => ({
      ...row,
      teamId: row.teamId,
      pos: row.pos,
      played: row.played,
      pts: row.pts,
    }));
  }

  let s13Fixed = 0;
  for (const g of 'ABCDEFGHIJKL'.split('')) {
    if (isDegraded(s13.groups[g])) {
      s13.groups[g] = rebuildGroupWinProbs(s13.groups[g], g, s13Standings);
      s13Fixed++;
    }
  }
  log('Jun 13: rebuilt ' + s13Fixed + ' degraded groups');

  // Also fix team advanceProbs that were market but degraded
  // (Market values came from Polymarket and are authoritative — just keep them)
  // No change needed for team-level probs

  saveJSON(path.join(SNAP_DIR, '2026-06-13.json'), s13);
  log('✅ Jun 13 saved');

  // ── Repair Jun 14 ──
  log('--- Repairing Jun 14 ---');

  // 1. Restore standings for Groups A-D from Jun 13
  const groupsWithRealData = ['A', 'B', 'C', 'D'];
  for (const g of groupsWithRealData) {
    if (s13.groups[g]?.standings && s14.groups[g]) {
      s14.groups[g].standings = JSON.parse(JSON.stringify(s13.groups[g].standings));
      log('Jun 14: restored Group ' + g + ' standings from Jun 13');
    }
  }

  // 2. Restore scorers from Jun 13
  let scorersRestored = 0;
  for (const t13 of s13.teams) {
    const t14 = s14.teams.find(t => t.id === t13.id);
    if (!t14) continue;
    for (const g13 of (t13.groupResults || [])) {
      if (!g13.scorers?.length) continue;
      const g14 = t14.groupResults?.find(r => r.matchday === g13.matchday && r.opponent === g13.opponent);
      if (g14 && !g14.scorers.length) {
        g14.scorers = [...g13.scorers];
        scorersRestored++;
      }
    }
  }
  log('Jun 14: restored ' + scorersRestored + ' scorer entries');

  // 3. Restore market-sourced advanceProbs for teams that lost them
  let probsRestored = 0;
  for (const t13 of s13.teams) {
    if (t13.advanceProbabilities?.source !== 'market') continue;
    const t14 = s14.teams.find(t => t.id === t13.id);
    if (t14 && t14.advanceProbabilities?.source !== 'market') {
      t14.advanceProbabilities = JSON.parse(JSON.stringify(t13.advanceProbabilities));
      probsRestored++;
    }
  }
  log('Jun 14: restored market probs for ' + probsRestored + ' teams');

  // 4. Rebuild all group winProbs using standings (now restored for A-D)
  const s14Standings = {};
  for (const g of 'ABCDEFGHIJKL'.split('')) {
    const gd = s14.groups[g];
    if (!gd) continue;
    s14Standings[g] = (gd.standings || []).map(row => ({
      ...row,
      teamId: row.teamId,
      pos: row.pos,
      played: row.played,
      pts: row.pts,
    }));
  }

  let s14Fixed = 0;
  for (const g of 'ABCDEFGHIJKL'.split('')) {
    if (isDegraded(s14.groups[g])) {
      s14.groups[g] = rebuildGroupWinProbs(s14.groups[g], g, s14Standings);
      s14Fixed++;
    }
  }
  log('Jun 14: rebuilt ' + s14Fixed + ' degraded groups');

  saveJSON(path.join(SNAP_DIR, '2026-06-14.json'), s14);
  log('✅ Jun 14 saved');

  // ── Verify ──
  log('--- Verification ---');
  const v13 = loadJSON(path.join(SNAP_DIR, '2026-06-13.json'));
  const v14 = loadJSON(path.join(SNAP_DIR, '2026-06-14.json'));

  for (const [label, d] of [['Jun 13', v13], ['Jun 14', v14]]) {
    let degraded = [];
    for (const g of 'ABCDEFGHIJKL'.split('')) {
      const wp = d.groups[g]?.winProbabilities || {};
      const total = Object.values(wp).reduce((a, b) => a + b, 0);
      if (total < 10) degraded.push(g);
    }
    const teamsWithScorers = d.teams.filter(t => t.groupResults?.some(gr => gr.scorers?.length > 0)).length;
    const sources = {};
    d.teams.forEach(t => { sources[t.advanceProbabilities.source] = (sources[t.advanceProbabilities.source] || 0) + 1; });
    console.log(label + ': degraded=' + JSON.stringify(degraded) + ' scorers=' + teamsWithScorers + ' teams sources=' + JSON.stringify(sources));
  }

  log('=== Done ===');
}

main();
