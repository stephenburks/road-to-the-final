#!/usr/bin/env node
/**
 * generate-snapshots.js — Generate missing pre-tournament and early-day snapshots
 * ───────────────────────────────────────────────────────────────────────────
 * Generates two snapshots with no API calls:
 *   2026-06-11 — Tournament Start (pre-tournament, all teams 0 played)
 *   2026-06-12 — After Day 1 (3 matches played: Mexico, Canada, USA)
 *
 * Also backfills sourceSummary into existing 3 snapshots.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const SNAP_DIR = path.join(DATA_DIR, 'snapshots');
const MF_PATH  = path.join(SNAP_DIR, 'manifest.json');

// ─── Shared data from update-data.js ──────────────────────────────────────────
const ALL_TEAMS = [
  { id:'mexico',      name:'Mexico',         flag:'🇲🇽', group:'A', confederation:'CONCACAF', fifaRank:15 },
  { id:'southafrica', name:'South Africa',   flag:'🇿🇦', group:'A', confederation:'CAF',      fifaRank:58 },
  { id:'southkorea',  name:'South Korea',    flag:'🇰🇷', group:'A', confederation:'AFC',      fifaRank:22 },
  { id:'czechia',     name:'Czechia',        flag:'🇨🇿', group:'A', confederation:'UEFA',     fifaRank:37 },
  { id:'canada',      name:'Canada',         flag:'🇨🇦', group:'B', confederation:'CONCACAF', fifaRank:27 },
  { id:'bosnia',      name:'Bosnia & Herz.', flag:'🇧🇦', group:'B', confederation:'UEFA',     fifaRank:71 },
  { id:'qatar',       name:'Qatar',          flag:'🇶🇦', group:'B', confederation:'AFC',      fifaRank:51 },
  { id:'switzerland', name:'Switzerland',    flag:'🇨🇭', group:'B', confederation:'UEFA',     fifaRank:17 },
  { id:'brazil',      name:'Brazil',         flag:'🇧🇷', group:'C', confederation:'CONMEBOL', fifaRank:4  },
  { id:'morocco',     name:'Morocco',        flag:'🇲🇦', group:'C', confederation:'CAF',      fifaRank:14 },
  { id:'haiti',       name:'Haiti',          flag:'🇭🇹', group:'C', confederation:'CONCACAF', fifaRank:83 },
  { id:'scotland',    name:'Scotland',       flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', group:'C', confederation:'UEFA',     fifaRank:39 },
  { id:'usa',         name:'USA',            flag:'🇺🇸', group:'D', confederation:'CONCACAF', fifaRank:14 },
  { id:'paraguay',    name:'Paraguay',       flag:'🇵🇾', group:'D', confederation:'CONMEBOL', fifaRank:39 },
  { id:'australia',   name:'Australia',      flag:'🇦🇺', group:'D', confederation:'AFC',      fifaRank:26 },
  { id:'turkey',      name:'Türkiye',        flag:'🇹🇷', group:'D', confederation:'UEFA',     fifaRank:25 },
  { id:'germany',     name:'Germany',        flag:'🇩🇪', group:'E', confederation:'UEFA',     fifaRank:9  },
  { id:'curacao',     name:'Curaçao',        flag:'🇨🇼', group:'E', confederation:'CONCACAF', fifaRank:82 },
  { id:'ivorycoast',  name:'Ivory Coast',    flag:'🇨🇮', group:'E', confederation:'CAF',      fifaRank:42 },
  { id:'ecuador',     name:'Ecuador',        flag:'🇪🇨', group:'E', confederation:'CONMEBOL', fifaRank:23 },
  { id:'netherlands', name:'Netherlands',    flag:'🇳🇱', group:'F', confederation:'UEFA',     fifaRank:7  },
  { id:'japan',       name:'Japan',          flag:'🇯🇵', group:'F', confederation:'AFC',      fifaRank:13 },
  { id:'sweden',      name:'Sweden',         flag:'🇸🇪', group:'F', confederation:'UEFA',     fifaRank:29 },
  { id:'tunisia',     name:'Tunisia',        flag:'🇹🇳', group:'F', confederation:'CAF',      fifaRank:36 },
  { id:'belgium',     name:'Belgium',        flag:'🇧🇪', group:'G', confederation:'UEFA',     fifaRank:9  },
  { id:'egypt',       name:'Egypt',          flag:'🇪🇬', group:'G', confederation:'CAF',      fifaRank:34 },
  { id:'iran',        name:'Iran',           flag:'🇮🇷', group:'G', confederation:'AFC',      fifaRank:21 },
  { id:'newzealand',  name:'New Zealand',    flag:'🇳🇿', group:'G', confederation:'OFC',      fifaRank:86 },
  { id:'spain',       name:'Spain',          flag:'🇪🇸', group:'H', confederation:'UEFA',     fifaRank:1  },
  { id:'capeverde',   name:'Cape Verde',     flag:'🇨🇻', group:'H', confederation:'CAF',      fifaRank:62 },
  { id:'saudiarabia', name:'Saudi Arabia',   flag:'🇸🇦', group:'H', confederation:'AFC',      fifaRank:55 },
  { id:'uruguay',     name:'Uruguay',        flag:'🇺🇾', group:'H', confederation:'CONMEBOL', fifaRank:18 },
  { id:'france',      name:'France',         flag:'🇫🇷', group:'I', confederation:'UEFA',     fifaRank:3  },
  { id:'senegal',     name:'Senegal',        flag:'🇸🇳', group:'I', confederation:'CAF',      fifaRank:14 },
  { id:'iraq',        name:'Iraq',           flag:'🇮🇶', group:'I', confederation:'AFC',      fifaRank:58 },
  { id:'norway',      name:'Norway',         flag:'🇳🇴', group:'I', confederation:'UEFA',     fifaRank:31 },
  { id:'argentina',   name:'Argentina',      flag:'🇦🇷', group:'J', confederation:'CONMEBOL', fifaRank:2  },
  { id:'algeria',     name:'Algeria',        flag:'🇩🇿', group:'J', confederation:'CAF',      fifaRank:35 },
  { id:'austria',     name:'Austria',        flag:'🇦🇹', group:'J', confederation:'UEFA',     fifaRank:24 },
  { id:'jordan',      name:'Jordan',         flag:'🇯🇴', group:'J', confederation:'AFC',      fifaRank:66 },
  { id:'portugal',    name:'Portugal',       flag:'🇵🇹', group:'K', confederation:'UEFA',     fifaRank:6  },
  { id:'drcongo',     name:'DR Congo',       flag:'🇨🇩', group:'K', confederation:'CAF',      fifaRank:56 },
  { id:'uzbekistan',  name:'Uzbekistan',     flag:'🇺🇿', group:'K', confederation:'AFC',      fifaRank:50 },
  { id:'colombia',    name:'Colombia',       flag:'🇨🇴', group:'K', confederation:'CONMEBOL', fifaRank:13 },
  { id:'england',     name:'England',        flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', group:'L', confederation:'UEFA',     fifaRank:5  },
  { id:'croatia',     name:'Croatia',        flag:'🇭🇷', group:'L', confederation:'UEFA',     fifaRank:10 },
  { id:'ghana',       name:'Ghana',          flag:'🇬🇭', group:'L', confederation:'CAF',      fifaRank:60 },
  { id:'panama',      name:'Panama',         flag:'🇵🇦', group:'L', confederation:'CONCACAF', fifaRank:76 },
];

const GROUP_SCHEDULE = {
   A:[{md:1,h:'mexico',     a:'southafrica',d:'2026-06-11',v:'Estadio Azteca, Mexico City'},
      {md:1,h:'southkorea', a:'czechia',    d:'2026-06-11',v:'Estadio Akron, Zapopan'},
      {md:2,h:'czechia',    a:'southafrica',d:'2026-06-18',v:'Mercedes-Benz Stadium, Atlanta'},
      {md:2,h:'mexico',     a:'southkorea', d:'2026-06-18',v:'Estadio Akron, Zapopan'},
      {md:3,h:'czechia',    a:'mexico',     d:'2026-06-24',v:'Estadio Akron, Zapopan'},
      {md:3,h:'southafrica',a:'southkorea', d:'2026-06-24',v:'Estadio Akron, Zapopan'}],
  B:[{md:1,h:'canada',     a:'bosnia',     d:'2026-06-12',v:'BMO Field, Toronto'},
      {md:1,h:'qatar',      a:'switzerland',d:'2026-06-13',v:"Levi's Stadium, San Francisco"},
      {md:2,h:'switzerland',a:'bosnia',     d:'2026-06-18',v:"Levi's Stadium, San Francisco"},
      {md:2,h:'canada',     a:'qatar',      d:'2026-06-18',v:'BC Place, Vancouver'},
      {md:3,h:'switzerland',a:'canada',     d:'2026-06-24',v:'BC Place, Vancouver'},
      {md:3,h:'bosnia',     a:'qatar',      d:'2026-06-24',v:'Lumen Field, Seattle'}],
  C:[{md:1,h:'brazil',     a:'morocco',    d:'2026-06-13',v:'MetLife Stadium, New Jersey'},
      {md:1,h:'haiti',      a:'scotland',   d:'2026-06-13',v:'Gillette Stadium, Boston'},
      {md:2,h:'scotland',   a:'morocco',    d:'2026-06-19',v:'Gillette Stadium, Boston'},
      {md:2,h:'brazil',     a:'haiti',      d:'2026-06-19',v:'Lincoln Financial Field, Philadelphia'},
      {md:3,h:'scotland',   a:'brazil',     d:'2026-06-24',v:'Hard Rock Stadium, Miami'},
      {md:3,h:'morocco',    a:'haiti',      d:'2026-06-24',v:'Mercedes-Benz Stadium, Atlanta'}],
  D:[{md:1,h:'usa',        a:'paraguay',   d:'2026-06-12',v:'SoFi Stadium, Los Angeles'},
      {md:1,h:'australia',  a:'turkey',     d:'2026-06-13',v:'BC Place, Vancouver'},
      {md:2,h:'usa',        a:'australia',  d:'2026-06-19',v:'Lumen Field, Seattle'},
      {md:2,h:'turkey',     a:'paraguay',   d:'2026-06-19',v:"Levi's Stadium, San Francisco"},
      {md:3,h:'turkey',     a:'usa',        d:'2026-06-25',v:'SoFi Stadium, Los Angeles'},
      {md:3,h:'paraguay',   a:'australia',  d:'2026-06-25',v:"Levi's Stadium, San Francisco"}],
  E:[{md:1,h:'germany',    a:'curacao',    d:'2026-06-14',v:'NRG Stadium, Houston'},
      {md:1,h:'ivorycoast', a:'ecuador',    d:'2026-06-14',v:'Lincoln Financial Field, Philadelphia'},
      {md:2,h:'germany',    a:'ivorycoast', d:'2026-06-20',v:'Mercedes-Benz Stadium, Atlanta'},
      {md:2,h:'ecuador',    a:'curacao',    d:'2026-06-20',v:'MetLife Stadium, New Jersey'},
      {md:3,h:'ecuador',    a:'germany',    d:'2026-06-25',v:'MetLife Stadium, New Jersey'},
      {md:3,h:'curacao',    a:'ivorycoast', d:'2026-06-25',v:'Lincoln Financial Field, Philadelphia'}],
  F:[{md:1,h:'netherlands',a:'japan',      d:'2026-06-14',v:'Arrowhead Stadium, Kansas City'},
      {md:1,h:'sweden',     a:'tunisia',    d:'2026-06-14',v:'Arrowhead Stadium, Kansas City'},
      {md:2,h:'netherlands',a:'sweden',     d:'2026-06-20',v:'Arrowhead Stadium, Kansas City'},
      {md:2,h:'tunisia',    a:'japan',      d:'2026-06-20',v:'Arrowhead Stadium, Kansas City'},
      {md:3,h:'japan',      a:'sweden',     d:'2026-06-25',v:'AT&T Stadium, Dallas'},
      {md:3,h:'tunisia',    a:'netherlands',d:'2026-06-25',v:'Arrowhead Stadium, Kansas City'}],
  G:[{md:1,h:'belgium',    a:'egypt',      d:'2026-06-15',v:'Lumen Field, Seattle'},
      {md:1,h:'iran',       a:'newzealand', d:'2026-06-15',v:'SoFi Stadium, Los Angeles'},
      {md:2,h:'belgium',    a:'iran',       d:'2026-06-21',v:'SoFi Stadium, Los Angeles'},
      {md:2,h:'newzealand', a:'egypt',      d:'2026-06-21',v:'BC Place, Vancouver'},
      {md:3,h:'egypt',      a:'iran',       d:'2026-06-26',v:'Lumen Field, Seattle'},
      {md:3,h:'newzealand', a:'belgium',    d:'2026-06-26',v:'BC Place, Vancouver'}],
  H:[{md:1,h:'spain',      a:'capeverde',  d:'2026-06-15',v:'Mercedes-Benz Stadium, Atlanta'},
      {md:1,h:'saudiarabia',a:'uruguay',    d:'2026-06-15',v:'Hard Rock Stadium, Miami'},
      {md:2,h:'spain',      a:'saudiarabia',d:'2026-06-21',v:'Mercedes-Benz Stadium, Atlanta'},
      {md:2,h:'uruguay',    a:'capeverde',  d:'2026-06-21',v:'Hard Rock Stadium, Miami'},
      {md:3,h:'capeverde',  a:'saudiarabia',d:'2026-06-26',v:'NRG Stadium, Houston'},
      {md:3,h:'uruguay',    a:'spain',      d:'2026-06-26',v:'Estadio Guadalajara, Guadalajara'}],
  I:[{md:1,h:'france',     a:'senegal',    d:'2026-06-16',v:'MetLife Stadium, New Jersey'},
      {md:1,h:'iraq',       a:'norway',     d:'2026-06-16',v:'Gillette Stadium, Boston'},
      {md:2,h:'france',     a:'iraq',       d:'2026-06-22',v:'Lincoln Financial Field, Philadelphia'},
      {md:2,h:'norway',     a:'senegal',    d:'2026-06-22',v:'MetLife Stadium, New Jersey'},
      {md:3,h:'norway',     a:'france',     d:'2026-06-26',v:'Gillette Stadium, Boston'},
      {md:3,h:'senegal',    a:'iraq',       d:'2026-06-26',v:'BMO Field, Toronto'}],
  J:[{md:1,h:'argentina',  a:'algeria',    d:'2026-06-16',v:'Arrowhead Stadium, Kansas City'},
      {md:1,h:'austria',    a:'jordan',     d:'2026-06-16',v:"Levi's Stadium, San Francisco"},
      {md:2,h:'argentina',  a:'austria',    d:'2026-06-22',v:'SoFi Stadium, Los Angeles'},
      {md:2,h:'jordan',     a:'algeria',    d:'2026-06-22',v:'Arrowhead Stadium, Kansas City'},
      {md:3,h:'algeria',    a:'austria',    d:'2026-06-27',v:'Arrowhead Stadium, Kansas City'},
      {md:3,h:'jordan',     a:'argentina',  d:'2026-06-27',v:'AT&T Stadium, Dallas'}],
  K:[{md:1,h:'portugal',   a:'drcongo',    d:'2026-06-17',v:'NRG Stadium, Houston'},
      {md:1,h:'uzbekistan', a:'colombia',   d:'2026-06-17',v:'Estadio Azteca, Mexico City'},
      {md:2,h:'portugal',   a:'uzbekistan', d:'2026-06-23',v:'NRG Stadium, Houston'},
      {md:2,h:'colombia',   a:'drcongo',    d:'2026-06-23',v:'Estadio Azteca, Mexico City'},
      {md:3,h:'colombia',   a:'portugal',   d:'2026-06-27',v:'Hard Rock Stadium, Miami'},
      {md:3,h:'drcongo',    a:'uzbekistan', d:'2026-06-27',v:'Mercedes-Benz Stadium, Atlanta'}],
  L:[{md:1,h:'england',    a:'croatia',    d:'2026-06-17',v:'AT&T Stadium, Dallas'},
      {md:1,h:'ghana',      a:'panama',     d:'2026-06-17',v:'BMO Field, Toronto'},
      {md:2,h:'england',    a:'ghana',      d:'2026-06-23',v:'Lincoln Financial Field, Philadelphia'},
      {md:2,h:'panama',     a:'croatia',    d:'2026-06-23',v:'BMO Field, Toronto'},
      {md:3,h:'panama',     a:'england',    d:'2026-06-27',v:'MetLife Stadium, New Jersey'},
      {md:3,h:'croatia',    a:'ghana',      d:'2026-06-27',v:'Lincoln Financial Field, Philadelphia'}],
};

const _STAGE_ORDER = ['group_stage', 'r32', 'r16', 'qf', 'sf', 'final'];

const SF_DALLAS  = { match:101, date:'2026-07-14', city:'Dallas',       venue:'AT&T Stadium',          opponentDesc:'Winner QF bracket' };
const SF_ATLANTA = { match:102, date:'2026-07-15', city:'Atlanta',      venue:'Mercedes-Benz Stadium', opponentDesc:'Winner QF bracket' };
const FINAL_FIX  = { match:104, date:'2026-07-19', city:'New Jersey',  venue:'MetLife Stadium',        opponentDesc:'Winner other SF' };

const SF = { dallas: SF_DALLAS, atlanta: SF_ATLANTA };

function makePath(r32, r16, qf, sfKey) {
  return { r32, r16, qf, sf: SF[sfKey], final: FINAL_FIX };
}

const BRACKET_PATHS = {
  'A-1': makePath({match:79, date:'2026-06-28',city:'Mexico City',  venue:'Estadio Azteca',          opponentDesc:'Best 3rd from C/E/F/H/I'}, {match:93, date:'2026-07-05',city:'Guadalajara',  venue:'Estadio Guadalajara', opponentDesc:'Winner Match 79'}, {match:97, date:'2026-07-09',city:'Guadalajara',  venue:'Estadio Guadalajara', opponentDesc:'Winner Match 93'}, 'dallas'),
  'A-2': makePath({match:80, date:'2026-06-29',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Best 3rd from E/H/I/J/K'}, {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',         opponentDesc:'Winner Match 80'}, {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',        opponentDesc:'Winner Match 94'}, 'atlanta'),
  'B-1': makePath({match:85, date:'2026-07-02',city:'Boston',       venue:'Gillette Stadium',        opponentDesc:'Best 3rd from E/F/G/I/J'}, {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',            opponentDesc:'Winner Match 85'}, {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',   opponentDesc:'Winner Match 96'}, 'dallas'),
  'B-2': makePath({match:82, date:'2026-07-01',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Best 3rd from A/E/H/I/J'}, {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',         opponentDesc:'Winner Match 82'}, {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',        opponentDesc:'Winner Match 94'}, 'atlanta'),
  'C-1': makePath({match:87, date:'2026-07-03',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Best 3rd from D/E/I/J/L'}, {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',            opponentDesc:'Winner Match 86'}, {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',   opponentDesc:'Winner Match 96'}, 'dallas'),
  'C-2': makePath({match:88, date:'2026-07-03',city:'Dallas',       venue:'AT&T Stadium',            opponentDesc:'Runner-up Group D'},        {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',opponentDesc:'Winner Match 87'}, {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',   opponentDesc:'Winner Match 95'}, 'atlanta'),
  'D-1': makePath({match:81, date:'2026-07-01',city:'San Francisco',venue:"Levi's Stadium",          opponentDesc:'Best 3rd from B/E/F/I/J'}, {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',         opponentDesc:'Winner Group G (Match 82)'}, {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',        opponentDesc:'Winner Match 94'}, 'atlanta'),
  'D-2': makePath({match:88, date:'2026-07-03',city:'Dallas',       venue:'AT&T Stadium',            opponentDesc:'Winner Group C'},          {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',opponentDesc:'Winner Match 87'}, {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',   opponentDesc:'Winner Match 95'}, 'atlanta'),
  'E-1': makePath({match:81, date:'2026-07-01',city:'San Francisco',venue:"Levi's Stadium",          opponentDesc:'Best 3rd from B/E/F/I/J'}, {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',  opponentDesc:'Winner Match 82'}, {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',        opponentDesc:'Winner Match 94'}, 'atlanta'),
  'E-2': makePath({match:86, date:'2026-07-02',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Group J'},          {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',  opponentDesc:'Winner Match 86'}, {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',   opponentDesc:'Winner Match 96'}, 'dallas'),
  'F-1': makePath({match:88, date:'2026-07-03',city:'Dallas',       venue:'AT&T Stadium',            opponentDesc:'Runner-up Group D'},        {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',opponentDesc:'Winner Match 87'}, {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',   opponentDesc:'Winner Match 95'}, 'atlanta'),
  'F-2': makePath({match:87, date:'2026-07-03',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Group K'},          {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',  opponentDesc:'Winner Match 86'}, {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',   opponentDesc:'Winner Match 96'}, 'dallas'),
  'G-1': makePath({match:82, date:'2026-07-01',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Best 3rd from A/E/H/I/J'}, {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',         opponentDesc:'Winner Group D (Match 81)'}, {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',        opponentDesc:'Winner Match 94'}, 'atlanta'),
  'G-2': makePath({match:88, date:'2026-07-03',city:'Dallas',       venue:'AT&T Stadium',            opponentDesc:'Runner-up Group D'},        {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',opponentDesc:'Winner Match 87'}, {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',   opponentDesc:'Winner Match 95'}, 'atlanta'),
  'H-1': makePath({match:84, date:'2026-07-02',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Runner-up Group J'},        {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',  opponentDesc:'Winner Match 85'}, {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',   opponentDesc:'Winner Match 96'}, 'dallas'),
  'H-2': makePath({match:80, date:'2026-06-29',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Group L'},          {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',  opponentDesc:'Winner Match 80'}, {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',        opponentDesc:'Winner Match 94'}, 'atlanta'),
  'I-1': makePath({match:85, date:'2026-07-02',city:'Boston',       venue:'Gillette Stadium',        opponentDesc:'Best 3rd from E/F/G/I/J'}, {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',  opponentDesc:'Winner Match 85'}, {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',   opponentDesc:'Winner Match 96'}, 'dallas'),
  'I-2': makePath({match:86, date:'2026-07-02',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Group J'},          {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',  opponentDesc:'Winner Match 86'}, {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',   opponentDesc:'Winner Match 96'}, 'dallas'),
  'J-1': makePath({match:79, date:'2026-06-28',city:'Mexico City',  venue:'Estadio Azteca',          opponentDesc:'Best 3rd from C/E/F/H/I'}, {match:93, date:'2026-07-05',city:'Guadalajara',  venue:'Estadio Guadalajara', opponentDesc:'Winner Match 79'}, {match:97, date:'2026-07-09',city:'Guadalajara',  venue:'Estadio Guadalajara', opponentDesc:'Winner Match 93'}, 'dallas'),
  'J-2': makePath({match:84, date:'2026-07-02',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Group H'},          {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',  opponentDesc:'Winner Match 85'}, {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',   opponentDesc:'Winner Match 96'}, 'dallas'),
  'K-1': makePath({match:80, date:'2026-06-29',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Best 3rd from E/H/I/J/K'}, {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',         opponentDesc:'Winner Match 80'}, {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',        opponentDesc:'Winner Match 94'}, 'atlanta'),
  'K-2': makePath({match:83, date:'2026-06-29',city:'Toronto',      venue:'BMO Field',               opponentDesc:'Runner-up Group L'}, {match:95, date:'2026-07-07',city:'Atlanta', venue:'Mercedes-Benz Stadium',opponentDesc:'Winner Match 83'}, {match:99, date:'2026-07-11',city:'Miami', venue:'Hard Rock Stadium', opponentDesc:'Winner Match 95'}, 'atlanta'),
  'L-1': makePath({match:83, date:'2026-06-29',city:'Toronto',      venue:'BMO Field',               opponentDesc:'Runner-up Group K'}, {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',opponentDesc:'Winner Match 83'}, {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',   opponentDesc:'Winner Match 95'}, 'atlanta'),
  'L-2': makePath({match:80, date:'2026-06-29',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Group K'},  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',         opponentDesc:'Winner Match 80'}, {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',        opponentDesc:'Winner Match 94'}, 'atlanta'),
};

// ─── calcProbs (from update-data.js) ─────────────────────────────────────────
function calcProbs(teamId, group, standings) {
  const t = ALL_TEAMS.find(t => t.id === teamId);
  const base = t?.fifaRank ?? 50;
  const rows = standings[group] || [];
  const row = rows.find(r => r.teamId === teamId);
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

  const winner = Math.min(seed, 30);
  return {
    r32: Math.min(Math.round(winner * 2.8 + (pos <= 2 ? 20 : 5)), 99),
    r16: Math.round(Math.min(Math.round(winner * 2.8 + (pos <= 2 ? 20 : 5)), 99) * 0.55),
    qf: Math.round(Math.round(Math.min(Math.round(winner * 2.8 + (pos <= 2 ? 20 : 5)), 99) * 0.55) * 0.52),
    sf: Math.round(Math.round(Math.round(Math.min(Math.round(winner * 2.8 + (pos <= 2 ? 20 : 5)), 99) * 0.55) * 0.52) * 0.50),
    final: Math.round(Math.round(Math.round(Math.round(Math.min(Math.round(winner * 2.8 + (pos <= 2 ? 20 : 5)), 99) * 0.55) * 0.52) * 0.50) * 0.50),
    winner,
    source: 'calculated',
  };
}

// ─── Standings builder ────────────────────────────────────────────────────────
function buildGroupStandings(group, fakeStandings) {
  if (fakeStandings[group]) return fakeStandings[group];
  const sched = GROUP_SCHEDULE[group] || [];
  const ids = [...new Set([...sched.map(g => g.h), ...sched.map(g => g.a)])];
  return ids.map((id, i) => {
    const info = ALL_TEAMS.find(t => t.id === id) || { name: id, flag: '🏳️' };
    return { pos: i + 1, teamId: id, team: info.name, flag: info.flag, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  });
}

// ─── Build path for a team ────────────────────────────────────────────────────
function buildPath(teamId, group, standings) {
  const rows = standings[group] || [];
  const teamRow = rows.find(r => r.teamId === teamId);
  const pos = Math.min(teamRow?.pos ?? 1, 2);
  const key = `${group}-${pos}`;
  const bp = BRACKET_PATHS[key] || BRACKET_PATHS[`${group}-1`] || {};

  const sched = GROUP_SCHEDULE[group] || [];
  const teamGames = sched.filter(g => g.h === teamId || g.a === teamId);
  const dates = teamGames.map(g => g.d).sort();
  const first = dates[0] || '';
  const last = dates[dates.length - 1] || '';
  const cities = [...new Set(teamGames.map(g => g.v.split(',').pop().trim()))].slice(0, 3).join(' \u00B7 ');
  const pts = teamRow ? `${teamRow.pts}pt${teamRow.pts !== 1 ? 's' : ''} after MD${teamRow.played}` : `Group ${group}`;

  return {
    group_stage: { status: 'active', city: cities, venue: 'Various venues', date: `Jun ${first.slice(8)}\u2013${last.slice(8)}`, detail: pts },
    r32:   bp.r32   ? { status: 'upcoming', ...bp.r32 } : null,
    r16:   bp.r16   ? { status: 'future',   ...bp.r16 } : null,
    qf:    bp.qf    ? { status: 'future',   ...bp.qf } : null,
    sf:    bp.sf    ? { status: 'future',   ...bp.sf } : null,
    final: bp.final ? { status: 'future',   ...bp.final } : null,
  };
}

// ─── Build groupResults for a team ────────────────────────────────────────────
function buildGroupResults(teamId, group, matchResults) {
  const sched = GROUP_SCHEDULE[group] || [];
  return sched
    .filter(g => g.h === teamId || g.a === teamId)
    .sort((a, b) => a.md - b.md)
    .map(g => {
      const isHome = g.h === teamId;
      const oppId = isHome ? g.a : g.h;
      const oppInfo = ALL_TEAMS.find(t => t.id === oppId) || {};

      const matchKey = `${g.h}:${g.a}`;
      const match = matchResults.get(matchKey);
      let result = null, score = null;
      if (match) {
        const myG = isHome ? match.hGoals : match.aGoals;
        const opG = isHome ? match.aGoals : match.hGoals;
        result = myG > opG ? 'W' : myG < opG ? 'L' : 'D';
        score = `${myG}-${opG}`;
      }

      return {
        matchday: g.md, opponent: oppInfo.name || oppId, opponentFlag: oppInfo.flag || '🏳️',
        result, score, date: g.d, venue: g.v, scorers: [],
      };
    });
}

// ─── Jun 11 match results (Group A MD1) ──────────────────────────────────────
const DAY1_RESULTS = new Map([
  ['mexico:southafrica', { hGoals: 2, aGoals: 0 }],
]);

// ─── Jun 12 match results (adds to Jun 11) ────────────────────────────────────
const JUN12_RESULTS = new Map([
  ...DAY1_RESULTS,
  ['canada:bosnia',      { hGoals: 1, aGoals: 1 }],
  ['usa:paraguay',       { hGoals: 4, aGoals: 1 }],
]);

// ─── Generate a snapshot ──────────────────────────────────────────────────────
function generateSnapshot(snapshotDate, matchResults) {
  const now = new Date().toISOString();

  // Build per-group standings from match results
  const rawStandings = {};
  for (const g of 'ABCDEFGHIJKL'.split('')) {
    const sched = GROUP_SCHEDULE[g] || [];
    const teamIds = [...new Set([...sched.map(g => g.h), ...sched.map(g => g.a)])];
    const rows = teamIds.map((id, i) => {
      let played = 0, w = 0, d = 0, l = 0, gf = 0, ga = 0;
      for (const s of sched) {
        const key = `${s.h}:${s.a}`;
        const m = matchResults.get(key);
        if (!m) continue;
        if (id === s.h) { played++; w += m.hGoals > m.aGoals ? 1 : 0; d += m.hGoals === m.aGoals ? 1 : 0; l += m.hGoals < m.aGoals ? 1 : 0; gf += m.hGoals; ga += m.aGoals; }
        if (id === s.a) { played++; w += m.aGoals > m.hGoals ? 1 : 0; d += m.aGoals === m.hGoals ? 1 : 0; l += m.aGoals < m.hGoals ? 1 : 0; gf += m.aGoals; ga += m.hGoals; }
      }
      const pts = w * 3 + d;
      const gd = gf - ga;
      return { pos: i + 1, teamId: id, team: ALL_TEAMS.find(t => t.id === id)?.name || id, flag: ALL_TEAMS.find(t => t.id === id)?.flag || '🏳️', played, w, d, l, gf, ga, gd, pts };
    });
    rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    rows.forEach((r, i) => { r.pos = i + 1; });
    rawStandings[g] = rows;
  }

  // Build groups
  const groupsData = {};
  for (const g of 'ABCDEFGHIJKL'.split('')) {
    const standArr = rawStandings[g] || buildGroupStandings(g, rawStandings);
    const winProbs = {};
    standArr.forEach(s => {
      winProbs[s.teamId] = calcProbs(s.teamId, g, rawStandings).winner;
    });
    groupsData[g] = { standings: standArr, winProbabilities: winProbs };
  }

  // Build teams
  const teams = ALL_TEAMS.map(t => {
    const groupResults = buildGroupResults(t.id, t.group, matchResults);
    const probs = calcProbs(t.id, t.group, rawStandings);
    const path = buildPath(t.id, t.group, rawStandings);
    const possibleOpps = { r32: [], r16: [] };

    return {
      id: t.id, name: t.name, flag: t.flag,
      group: t.group, confederation: t.confederation, fifaRank: t.fifaRank,
      eliminated: false,
      currentStage: 'group_stage',
      groupResults,
      advanceProbabilities: probs,
      path,
      possibleOpponents: possibleOpps,
    };
  });

  // Source summary
  const sourceSummary = { market: 0, calculated: 48 };

  return {
    lastUpdated: now,
    snapshotDate,
    isHistorical: true,
    sourceSummary,
    tournament: {
      name: 'FIFA World Cup 2026',
      currentStage: 'group_stage',
      stages: {
        group_stage: { status: 'active',   label: 'Group Stage', date: 'Jun 11\u201327' },
        r32:         { status: 'upcoming', label: 'Round of 32', date: 'Jun 28\u2013Jul 2' },
        r16:         { status: 'future',   label: 'Round of 16', date: 'Jul 4\u20137' },
        qf:          { status: 'future',   label: 'Quarterfinal', date: 'Jul 9\u201311' },
        sf:          { status: 'future',   label: 'Semifinal',    date: 'Jul 14\u201315' },
        final:       { status: 'future',   label: 'The Final',    date: 'Jul 19' },
      },
    },
    groups: groupsData,
    teams,
  };
}

function fmtLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function addSourceSummary(filePath) {
  const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const summary = { market: 0, calculated: 0 };
  for (const t of (d.teams || [])) {
    const src = t.advanceProbabilities?.source;
    if (src === 'market') summary.market++;
    else summary.calculated++;
  }
  d.sourceSummary = summary;
  fs.writeFileSync(filePath, JSON.stringify(d, null, 2));
  return summary;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function main() {
  log('=== Generate Missing Snapshots ===');

  // Generate Jun 10 (pre-tournament — 0 matches, clean slate)
  log('Generating 2026-06-10 (Pre-tournament)');
  const s10 = generateSnapshot('2026-06-10', new Map());
  fs.writeFileSync(path.join(SNAP_DIR, '2026-06-10.json'), JSON.stringify(s10, null, 2));
  log('✅ Jun 10 saved — 0/' + s10.teams.length + ' teams with results');

  // Generate Jun 11 (after Day 1 — 2 matches)
  log('Generating 2026-06-11 (After Day 1)');
  const s11 = generateSnapshot('2026-06-11', DAY1_RESULTS);
  fs.writeFileSync(path.join(SNAP_DIR, '2026-06-11.json'), JSON.stringify(s11, null, 2));
  const s11Results = s11.teams.filter(t => t.groupResults.some(g => g.result)).length;
  log('✅ Jun 11 saved — ' + s11Results + '/' + s11.teams.length + ' teams with results');

  // Generate Jun 12 (after day 1 — 3 matches)
  log('Generating 2026-06-12 (After Day 1)');
  const s12 = generateSnapshot('2026-06-12', JUN12_RESULTS);
  fs.writeFileSync(path.join(SNAP_DIR, '2026-06-12.json'), JSON.stringify(s12, null, 2));
  const withResults = s12.teams.filter(t => t.groupResults.some(g => g.result)).length;
  log('✅ Jun 12 saved — ' + withResults + '/' + s12.teams.length + ' teams with results');

  // Backfill sourceSummary into existing 3 snapshots
  log('Backfilling sourceSummary into existing snapshots');
  for (const date of ['2026-06-13', '2026-06-14', '2026-06-15']) {
    const summary = addSourceSummary(path.join(SNAP_DIR, `${date}.json`));
    log('  ' + date + ': market=' + summary.market + ' calculated=' + summary.calculated);
  }

  // Update manifest
  const mf = fs.existsSync(MF_PATH)
    ? JSON.parse(fs.readFileSync(MF_PATH, 'utf8'))
    : { available: [], labels: {} };

  for (const d of ['2026-06-10', '2026-06-11', '2026-06-12']) {
    if (!mf.available.includes(d)) mf.available.push(d);
  }
  mf.available.sort();

  mf.available.forEach((d, i) => {
    const isLatest = i === mf.available.length - 1;
    const isEarliest = i === 0;
    mf.labels[d] = isLatest
      ? `${fmtLabel(d)} (Latest)`
      : isEarliest
        ? `${fmtLabel(d)} (Pre-tournament)`
        : fmtLabel(d);
  });

  mf.earliest = mf.available[0];
  mf.latest = mf.available[mf.available.length - 1];
  mf.generated = new Date().toISOString();

  fs.writeFileSync(MF_PATH, JSON.stringify(mf, null, 2));
  log('✅ Manifest updated — ' + mf.available.length + ' snapshots');

  // Verify
  log('--- Verification ---');
  const mfFinal = JSON.parse(fs.readFileSync(MF_PATH, 'utf8'));
  console.log('Available:', mfFinal.available.join(', '));
  console.log('Labels:', JSON.stringify(mfFinal.labels));
  for (const date of mfFinal.available) {
    const d = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, `${date}.json`), 'utf8'));
    const results = d.teams.flatMap(t => t.groupResults.filter(g => g.result)).length;
    console.log('  ' + date + ': ' + results + ' results, sourceSummary=' + JSON.stringify(d.sourceSummary));
  }

  log('=== Done ===');
}

main();
