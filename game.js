// ============================================================
//  Hong Kong Mahjong — game.js
//  Pure ES6, no dependencies
// ============================================================

// ── Tile Definition ────────────────────────────────────────
// suit: 'man'|'pin'|'sou'|'wind'|'dragon'|'flower'|'season'
// rank: 1-9 for suits; 1-4 for winds (E/S/W/N); 1-3 for dragons; 1-8 for bonus

const SUITS = ['man', 'pin', 'sou'];
const WIND_NAMES  = ['East', 'South', 'West', 'North'];
const WIND_CHARS  = ['東', '南', '西', '北'];
const DRAGON_NAMES= ['Chun', 'Hatsu', 'Haku'];
const DRAGON_CHARS= ['中', '發', '白'];
const FLOWER_CHARS= ['梅', '蘭', '菊', '竹'];
const SEASON_CHARS= ['春', '夏', '秋', '冬'];
const SUIT_CHARS  = {
  man: ['一','二','三','四','五','六','七','八','九'],
  pin: ['①','②','③','④','⑤','⑥','⑦','⑧','⑨'],
  sou: ['1','2','3','4','5','6','7','8','9'], // bamboo shown as numbers
};

let tileIdCounter = 0;
function makeTile(suit, rank) {
  return { id: tileIdCounter++, suit, rank };
}

function buildWall() {
  tileIdCounter = 0;
  const wall = [];
  // 3 suits × 9 ranks × 4
  for (const suit of SUITS) {
    for (let r = 1; r <= 9; r++) {
      for (let c = 0; c < 4; c++) wall.push(makeTile(suit, r));
    }
  }
  // 4 winds × 4
  for (let r = 1; r <= 4; r++) {
    for (let c = 0; c < 4; c++) wall.push(makeTile('wind', r));
  }
  // 3 dragons × 4
  for (let r = 1; r <= 3; r++) {
    for (let c = 0; c < 4; c++) wall.push(makeTile('dragon', r));
  }
  // 4 flowers + 4 seasons (1 each — bonus tiles)
  for (let r = 1; r <= 4; r++) wall.push(makeTile('flower', r));
  for (let r = 1; r <= 4; r++) wall.push(makeTile('season', r));
  return shuffle(wall);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tileKey(tile) {
  return `${tile.suit}-${tile.rank}`;
}
function tileEqual(a, b) {
  return a.suit === b.suit && a.rank === b.rank;
}

// ── Tile Rendering ─────────────────────────────────────────
function tileChar(tile) {
  if (tile.suit === 'man') return SUIT_CHARS.man[tile.rank - 1];
  if (tile.suit === 'pin') return SUIT_CHARS.pin[tile.rank - 1];
  if (tile.suit === 'sou') return tile.rank.toString();
  if (tile.suit === 'wind') return WIND_CHARS[tile.rank - 1];
  if (tile.suit === 'dragon') return DRAGON_CHARS[tile.rank - 1];
  if (tile.suit === 'flower') return FLOWER_CHARS[tile.rank - 1];
  if (tile.suit === 'season') return SEASON_CHARS[tile.rank - 1];
  return '?';
}

function suitLabel(suit) {
  const map = { man:'萬', pin:'筒', sou:'索', wind:'風', dragon:'龍', flower:'花', season:'季' };
  return map[suit] || '';
}

function tileSuitClass(tile) {
  if (tile.suit === 'flower' || tile.suit === 'season') return 'tile-bonus';
  return `tile-${tile.suit}`;
}

function renderTileEl(tile, size='lg', selectable=false, selected=false, justDrawn=false) {
  const el = document.createElement('div');
  el.className = `tile tile-${size} ${tileSuitClass(tile)}${selected ? ' selected' : ''}${justDrawn ? ' just-drawn' : ''}`;
  el.dataset.tileId = tile.id;

  const rank = document.createElement('div');
  rank.className = 'tile-rank';
  rank.textContent = tileChar(tile);

  const suit = document.createElement('div');
  suit.className = 'tile-suit';
  suit.textContent = suitLabel(tile.suit);

  el.appendChild(rank);
  el.appendChild(suit);

  if (selectable) {
    el.style.cursor = 'pointer';
  }
  return el;
}

function renderBackTile(size='sm') {
  const el = document.createElement('div');
  el.className = `tile tile-${size} tile-back`;
  return el;
}

// Mini tile for discards / help
function renderMiniTile(tile, size='xs') {
  const el = document.createElement('div');
  el.className = `tile tile-${size} ${tileSuitClass(tile)}`;
  const rank = document.createElement('div');
  rank.className = 'tile-rank';
  rank.textContent = tileChar(tile);
  el.appendChild(rank);
  return el;
}

// ── Mahjong Logic ──────────────────────────────────────────

function isBonus(tile) {
  return tile.suit === 'flower' || tile.suit === 'season';
}
function isHonor(tile) {
  return tile.suit === 'wind' || tile.suit === 'dragon';
}
function isSuit(tile) {
  return SUITS.includes(tile.suit);
}

// Group tiles by key for counting
function groupTiles(tiles) {
  const g = {};
  for (const t of tiles) {
    const k = tileKey(t);
    g[k] = (g[k] || []);
    g[k].push(t);
  }
  return g;
}

// Can form a chow with these 3 tiles?
function isChow(a, b, c) {
  if (a.suit !== b.suit || b.suit !== c.suit) return false;
  if (!isSuit(a)) return false;
  const ranks = [a.rank, b.rank, c.rank].sort((x, y) => x - y);
  return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
}

// Find all valid chow sets in a hand that include a given discard tile
// Returns arrays of 3 tiles (including the discard tile) forming valid sequences
function findChowsWithTile(hand, tile) {
  if (!isSuit(tile)) return [];
  const r = tile.rank;
  const s = tile.suit;
  const results = [];
  // Possible sequences involving tile: [r-2,r-1,r], [r-1,r,r+1], [r,r+1,r+2]
  const patterns = [
    [r-2, r-1, r], [r-1, r, r+1], [r, r+1, r+2]
  ].filter(p => p[0] >= 1 && p[2] <= 9);

  for (const [a, b, c] of patterns) {
    // We need the other 2 ranks from hand (not the discard tile)
    const neededRanks = [a, b, c].filter(rr => rr !== r);
    // Group hand tiles by rank
    const byRank = {};
    for (const t of hand) {
      if (t.suit !== s) continue;
      if (!byRank[t.rank]) byRank[t.rank] = [];
      byRank[t.rank].push(t);
    }
    // Check we have all needed ranks in hand
    let valid = true;
    const used = [tile]; // the discard tile
    for (const nr of neededRanks) {
      if (!byRank[nr] || byRank[nr].length === 0) { valid = false; break; }
      used.push(byRank[nr].shift()); // take one from hand
    }
    if (valid) results.push(used.sort((x,y) => x.rank - y.rank));
  }
  return results;
}

// Check if a hand is a winning hand.
// hand14: the tiles in hand (not including meld tiles which are separate)
// melds: already-declared melds (pong/kong/chow sets from previous claims)
// The hand is: 14 tiles in hand (after melds removed) or (14 - 3*melds.length) tiles + melds
// In practice: call with the player's current hand array (which already excludes meld tiles)
// plus one extra tile (the drawn or claimed tile) making it (13 - 3*melds.length + 1) + 3*melds
// i.e. hand.length should be (2 + 3 * (4 - melds.length)) = 14 - 3*melds.length
function checkWin(handTiles, melds=[]) {
  const playing = handTiles.filter(t => !isBonus(t));
  // With existing melds, hand should have 14 - 3*melds.length tiles
  const expectedSize = 14 - melds.length * 3;
  if (playing.length !== expectedSize) return false;
  if (playing.length % 3 !== 2) return false;
  return findWinningHand(playing, melds);
}

function findWinningHand(tiles, existingMelds=[]) {
  if (tiles.length % 3 !== 2) return false;

  // Special: 7 pairs (only when no existing melds)
  if (tiles.length === 14 && existingMelds.length === 0) {
    const pairs = findSevenPairs(tiles);
    if (pairs) return { melds: pairs, pair: null, fan: calcFanSevenPairs(tiles, pairs), special: '7pairs', allMelds: pairs };
  }

  // Try each unique tile as the pair
  const tried = new Set();
  for (const tile of tiles) {
    const k = tileKey(tile);
    if (tried.has(k)) continue;
    tried.add(k);
    const matching = tiles.filter(t => tileEqual(t, tile));
    if (matching.length < 2) continue;
    const rest = removeTiles(tiles, [matching[0], matching[1]]);
    if (rest === null) continue;
    const meldSets = tryMeldAll(rest);
    if (meldSets !== false) {
      const allMelds = [...existingMelds, ...meldSets];
      const fan = calcFan(allMelds, matching[0], tiles);
      return { melds: meldSets, pair: [matching[0], matching[1]], fan, allMelds };
    }
  }
  return false;
}

function removeFirst(arr, target) {
  const idx = arr.findIndex(t => tileEqual(t, target));
  if (idx === -1) return null;
  const result = [...arr];
  result.splice(idx, 1);
  return result;
}

// Recursively try to form melds (sets of 3) from tiles — exhaustive
function tryMeldAll(tiles) {
  if (tiles.length === 0) return [];
  if (tiles.length % 3 !== 0) return false;

  // Sort for determinism — always process the "smallest" tile first
  const sorted = [...tiles].sort(tileSortCmp);
  const first = sorted[0];

  // Try pong with first tile
  const sameOnes = sorted.filter(t => tileEqual(t, first) && t.id !== first.id);
  if (sameOnes.length >= 2) {
    const rest = removeTiles(sorted, [first, sameOnes[0], sameOnes[1]]);
    if (rest !== null) {
      const result = tryMeldAll(rest);
      if (result !== false) return [{ type: 'pong', tiles: [first, sameOnes[0], sameOnes[1]] }, ...result];
    }
  }

  // Try chow with first tile (only suit tiles)
  if (isSuit(first)) {
    // Try r, r+1, r+2
    const t1 = sorted.find(t => t.id !== first.id && t.suit === first.suit && t.rank === first.rank + 1);
    const t2 = t1 ? sorted.find(t => t.id !== first.id && t.id !== t1.id && t.suit === first.suit && t.rank === first.rank + 2) : null;
    if (t1 && t2) {
      const rest = removeTiles(sorted, [first, t1, t2]);
      if (rest !== null) {
        const result = tryMeldAll(rest);
        if (result !== false) return [{ type: 'chow', tiles: [first, t1, t2] }, ...result];
      }
    }
  }

  // If we can't form any meld with the first tile, hand is invalid
  return false;
}

function removeTiles(arr, toRemove) {
  const result = [...arr];
  for (const t of toRemove) {
    const idx = result.findIndex(x => x.id === t.id);
    if (idx === -1) return null;
    result.splice(idx, 1);
  }
  return result;
}

function tileSortCmp(a, b) {
  const suitOrder = { man:0, pin:1, sou:2, wind:3, dragon:4 };
  const sa = suitOrder[a.suit] ?? 5;
  const sb = suitOrder[b.suit] ?? 5;
  if (sa !== sb) return sa - sb;
  return a.rank - b.rank;
}

function findSevenPairs(tiles) {
  const g = groupTiles(tiles);
  const pairs = Object.values(g);
  if (pairs.length !== 7) return false;
  if (pairs.every(p => p.length === 2)) {
    return pairs.map(p => ({ type: 'pair', tiles: p }));
  }
  return false;
}

// ── Fan (scoring) calculation ──────────────────────────────
function calcFan(melds, pairTile, allTiles) {
  let fan = 0;
  const breakdown = [];

  const isPong = m => m.type === 'pong' || m.type === 'kong';
  const isChowM = m => m.type === 'chow';

  const allPong = melds.every(isPong);
  const allChow = melds.every(isChowM);
  const suitSet = new Set(allTiles.filter(isSuit).map(t=>t.suit));
  const hasOnlyOneSuit = suitSet.size === 1;
  const hasNoHonors = allTiles.every(t => !isHonor(t));
  const hasNoSuit = allTiles.every(t => isHonor(t));

  // All Triplets (対々和)
  if (melds.length > 0 && allPong) { fan += 3; breakdown.push('All Triplets +3'); }
  // All Sequences (平和)
  if (melds.length > 0 && allChow && !isHonor(pairTile)) { fan += 1; breakdown.push('All Sequences +1'); }
  // Mixed One-Suit
  if (hasOnlyOneSuit && !hasNoHonors) { fan += 3; breakdown.push('Mixed One-Suit +3'); }
  // Pure One-Suit
  if (hasOnlyOneSuit && hasNoHonors) { fan += 7; breakdown.push('Pure One-Suit +7'); }
  // All Honors
  if (hasNoSuit) { fan += 10; breakdown.push('All Honors +10'); }

  // Dragon pongs
  for (const m of melds) {
    if (isPong(m) && m.tiles[0].suit === 'dragon') {
      fan += 1; breakdown.push(`Dragon Triplet +1`);
    }
  }
  // Wind pong (round wind or seat wind)
  for (const m of melds) {
    if (isPong(m) && m.tiles[0].suit === 'wind') {
      fan += 1; breakdown.push(`Wind Triplet +1`);
    }
  }
  // Dragon pair
  if (pairTile && pairTile.suit === 'dragon') { fan += 1; breakdown.push('Dragon Pair +1'); }

  // Kong (extra fan)
  for (const m of melds) {
    if (m.type === 'kong') { fan += 1; breakdown.push('Kong +1'); }
  }

  // Chicken hand minimum
  if (fan < 1) { fan = 1; breakdown.push('Chicken Hand (min 1)'); }

  return { fan, breakdown };
}

function calcFanSevenPairs(tiles, pairs) {
  return { fan: 4, breakdown: ['Seven Pairs +4'] };
}

// ── Shanten calculation (for AI) ──────────────────────────
// Returns the shanten number (-1 = complete, 0 = tenpai, 1 = 1 away, etc.)
function calcShanten(tiles) {
  if (tiles.length === 0) return 8;
  const playing = tiles.filter(t => !isBonus(t));
  return Math.min(shantenNormal(playing), shantenSevenPairs(playing));
}

function shantenNormal(tiles) {
  let best = 8;
  const tried = new Set();

  // Try each unique tile as the pair
  for (const tile of tiles) {
    const k = tileKey(tile);
    if (tried.has(k)) continue;
    tried.add(k);
    const sameCount = tiles.filter(t => tileEqual(t, tile)).length;
    if (sameCount < 2) continue;
    const rest = removeFirst(removeFirst(tiles, tile), tile);
    if (!rest) continue;
    const s = shantenFromMelds(rest);
    if (s < best) best = s;
  }

  // Also try without a designated pair (upper bound)
  const s2 = shantenFromMelds(tiles) + 1;
  if (s2 < best) best = s2;

  return best;
}

function shantenFromMelds(tiles) {
  // DFS approach: find best split into complete melds + partial
  const n = tiles.length;
  if (n === 0) return -1;
  const numMeldsNeeded = Math.floor(n / 3);
  const [complete, partial] = bestMeldCount(tiles);
  // shanten for melds part = numMeldsNeeded - 1 - complete - partial
  return Math.max(-1, numMeldsNeeded - 1 - complete - partial + (n % 3 === 0 ? 0 : 0));
}

function bestMeldCount(tiles) {
  // Try all ways to extract melds greedily, return [complete, partial]
  const sorted = [...tiles].sort(tileSortCmp);
  return bestMeldHelper(sorted, 0, 0);
}

function bestMeldHelper(tiles, complete, partial) {
  if (tiles.length === 0) return [complete, partial];

  let best = [complete, partial];
  const used = new Set();

  // Try complete melds first
  for (let i = 0; i < tiles.length; i++) {
    if (used.has(i)) continue;
    const a = tiles[i];

    // Pong
    for (let j = i+1; j < tiles.length; j++) {
      if (used.has(j)) continue;
      if (!tileEqual(tiles[j], a)) continue;
      for (let k = j+1; k < tiles.length; k++) {
        if (used.has(k)) continue;
        if (!tileEqual(tiles[k], a)) continue;
        const rest = tiles.filter((_,idx) => idx!==i && idx!==j && idx!==k);
        const res = bestMeldHelper(rest, complete+1, partial);
        if (res[0]*2+res[1] > best[0]*2+best[1]) best = res;
        break;
      }
      break;
    }

    // Chow
    if (isSuit(a)) {
      const r = a.rank;
      for (let off = 1; off <= 2; off++) {
        const j2 = tiles.findIndex((t,idx) => idx > i && !used.has(idx) && t.suit===a.suit && t.rank===r+off);
        if (j2 === -1) continue;
        const need3 = off === 1 ? r+2 : r+1;
        const k2 = tiles.findIndex((t,idx) => idx > i && idx !== j2 && !used.has(idx) && t.suit===a.suit && t.rank===need3);
        if (k2 === -1) continue;
        const rest = tiles.filter((_,idx) => idx!==i && idx!==j2 && idx!==k2);
        const res = bestMeldHelper(rest, complete+1, partial);
        if (res[0]*2+res[1] > best[0]*2+best[1]) best = res;
      }
    }
    break; // Only try from first tile for performance
  }

  // Try partial melds (pairs + partial sequences)
  for (let i = 0; i < tiles.length - 1; i++) {
    const a = tiles[i];
    const b = tiles[i+1];
    if (tileEqual(a, b) || (a.suit===b.suit && isSuit(a) && b.rank-a.rank <= 2)) {
      const rest = tiles.filter((_,idx) => idx!==i && idx!==i+1);
      const res = bestMeldHelper(rest, complete, partial+1);
      if (res[0]*2+res[1] > best[0]*2+best[1]) best = res;
    }
  }

  return best;
}

function shantenSevenPairs(tiles) {
  if (tiles.length !== 13 && tiles.length !== 14) return 8;
  const groups = groupTiles(tiles);
  const pairs = Object.values(groups).filter(g => g.length >= 2).length;
  return 6 - pairs;
}

// ── AI Strategy ────────────────────────────────────────────

class AIPlayer {
  constructor(seat, difficulty) {
    this.seat = seat;
    this.difficulty = difficulty; // 'easy'|'medium'|'hard'
    this.discardTracker = new Set(); // tiles seen discarded by all
    this.safeDiscards = new Set();
  }

  chooseDraw() { return true; } // AI always draws

  // Decide which tile to discard
  chooseDiscard(hand, melds, roundWind, seatWind) {
    const playing = hand.filter(t => !isBonus(t));
    if (this.difficulty === 'easy') {
      return playing[Math.floor(Math.random() * playing.length)];
    }
    // Medium/Hard: discard tile that increases shanten the least
    return this.smartDiscard(playing, melds, roundWind, seatWind);
  }

  smartDiscard(hand, melds, roundWind, seatWind) {
    let bestTile = null, bestShanten = 99;

    for (const tile of hand) {
      const rest = removeFirst(hand, tile);
      if (!rest) continue;
      const s = calcShanten(rest);
      let score = s;

      if (this.difficulty === 'hard') {
        // Prefer safe discards (tiles already discarded)
        if (this.safeDiscards.has(tileKey(tile))) score -= 0.5;
        // Avoid discarding valued tiles unnecessarily
        if (tile.suit === 'dragon') score -= 1; // dragons are valuable
        if (tile.suit === 'wind' && (tile.rank === roundWind || tile.rank === seatWind)) score -= 1;
      }

      if (score < bestShanten || (score === bestShanten && Math.random() < 0.3)) {
        bestShanten = score;
        bestTile = tile;
      }
    }
    return bestTile || hand[0];
  }

  // Should AI declare Pong?
  shouldPong(hand, melds, tile, roundWind, seatWind) {
    if (this.difficulty === 'easy') return Math.random() < 0.3;
    const currentShanten = calcShanten(hand);
    const handAfter = [...hand.filter(t=>!isBonus(t))];
    // Simulate: add tile, form pong, discard worst
    const playing = handAfter.filter(t => !isBonus(t));
    const pongBonus = (tile.suit === 'dragon' || tile.suit === 'wind') ? 1 : 0;
    const wouldPong = playing.filter(t => tileEqual(t, tile)).length >= 2;
    if (!wouldPong) return false;
    // Check if shanten improves
    const testHand = [...playing, tile]; // 14 tiles
    const newMelds = [...melds, { type:'pong', tiles:[tile,tile,tile]}]; // simplified
    const newShanten = calcShanten(testHand.filter(t=>!tileEqual(t,tile)));
    if (this.difficulty === 'medium') return newShanten <= currentShanten - 1 || pongBonus > 0;
    if (this.difficulty === 'hard') return (newShanten < currentShanten || pongBonus > 0) && currentShanten <= 2;
    return false;
  }

  // Should AI declare Chow?
  shouldChow(hand, melds, tile) {
    if (this.difficulty === 'easy') return Math.random() < 0.2;
    if (!isSuit(tile)) return false;
    const chows = findChowsWithTile(hand.filter(t=>!isBonus(t)), tile);
    if (chows.length === 0) return false;
    const currentShanten = calcShanten(hand.filter(t=>!isBonus(t)));
    if (this.difficulty === 'medium') return currentShanten >= 1 && Math.random() < 0.5;
    if (this.difficulty === 'hard') return currentShanten >= 1;
    return false;
  }

  trackDiscard(tile) {
    this.safeDiscards.add(tileKey(tile));
  }
}

// ── Game State ─────────────────────────────────────────────
const STATE = {
  wall: [],
  wallIdx: 0,
  players: [], // 4 players: 0=human, 1=west, 2=north, 3=south
  currentTurn: 0,
  roundWind: 1, // 1=East
  roundNum: 1,
  phase: 'menu', // menu|draw|discard|claim|win|draw_game
  lastDiscard: null,
  lastDiscardBy: -1,
  pendingChow: null,
  difficulty: 'medium',
  scores: [0, 0, 0, 0],
  aiThinkTimeout: null,
  animating: false,
};

const SEAT_WINDS = [1, 3, 4, 2]; // Human=East(1), AI-West(3), AI-North(4), AI-South(2)
const SEAT_NAMES = ['You', 'West', 'North', 'South'];

function dealHand() {
  const hand = [];
  for (let i = 0; i < 13; i++) hand.push(drawFromWall());
  return hand;
}

function drawFromWall() {
  if (STATE.wallIdx >= STATE.wall.length) return null;
  return STATE.wall[STATE.wallIdx++];
}

function wallRemaining() {
  return STATE.wall.length - STATE.wallIdx;
}

// ── Main App Controller ────────────────────────────────────
const App = window.App = {
  difficulty: 'medium',

  setDifficulty(diff) {
    this.difficulty = diff;
    document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('selected'));
    const el = document.getElementById(`diff-${diff}`);
    if (el) el.classList.add('selected');
    // Also update the start button
    const startBtn = document.querySelector('#screen-menu .btn-primary');
    if (startBtn) {
      startBtn.onclick = () => App.startGame(diff);
    }
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  goMenu() {
    clearTimeout(STATE.aiThinkTimeout);
    this.showScreen('screen-menu');
  },

  showHelp(inGame=false) {
    this._helpReturnScreen = inGame ? 'screen-game' : 'screen-menu';
    this.showScreen('screen-help');
    this.showHelpTab('basics');
  },

  closeHelp() {
    this.showScreen(this._helpReturnScreen || 'screen-menu');
  },

  showHelpTab(tab) {
    document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
    const tabBtn = [...document.querySelectorAll('.help-tab')].find(t => t.getAttribute('onclick').includes(tab));
    if (tabBtn) tabBtn.classList.add('active');
    document.getElementById('help-content').innerHTML = HELP_CONTENT[tab] || '';
  },

  startGame(diff) {
    if (diff) this.difficulty = diff;
    clearTimeout(STATE.aiThinkTimeout);

    // Init wall
    STATE.wall = buildWall();
    STATE.wallIdx = 0;
    STATE.lastDiscard = null;
    STATE.lastDiscardBy = -1;
    STATE.pendingChow = null;
    STATE.animating = false;

    // Init players
    STATE.players = [0,1,2,3].map(i => ({
      seat: i,
      seatWind: SEAT_WINDS[i],
      hand: [],
      melds: [],
      discards: [],
      bonus: [],
      ai: i > 0 ? new AIPlayer(i, this.difficulty) : null,
    }));

    // Deal
    for (const p of STATE.players) {
      p.hand = dealHand();
      // Extract bonus tiles and draw replacements
      this.extractBonus(p);
    }

    // East goes first (human = seat 0)
    STATE.currentTurn = 0;
    STATE.phase = 'draw';

    this.showScreen('screen-game');
    this.renderGame();
    this.updateActionBar();
    this.setTurnText('Your Turn — Draw a tile');
  },

  extractBonus(player) {
    let found = true;
    while (found) {
      found = false;
      const bonusIdx = player.hand.findIndex(isBonus);
      if (bonusIdx !== -1) {
        player.bonus.push(player.hand.splice(bonusIdx, 1)[0]);
        const newTile = drawFromWall();
        if (newTile) player.hand.push(newTile);
        found = true;
      }
    }
  },

  // ── Render ───────────────────────────────────────────────

  renderGame() {
    this.renderPlayerHand();
    this.renderAI();
    this.renderLastDiscard();
    document.getElementById('wall-count').textContent = wallRemaining();
    document.getElementById('player-score').textContent = STATE.scores[0];
    document.getElementById('round-wind').textContent = WIND_NAMES[STATE.roundWind - 1];
    document.getElementById('round-num').textContent = STATE.roundNum;
    const p = STATE.players[0];
    document.getElementById('player-wind-badge').textContent = WIND_NAMES[p.seatWind - 1] + ' Seat';
    this.renderPlayerMelds();
    this.updateShantenDisplay();
  },

  updateShantenDisplay() {
    const player = STATE.players[0];
    const tiles = player.hand.filter(t => !isBonus(t));
    if (tiles.length < 1) return;
    const badge = document.getElementById('player-wind-badge');
    if (!badge) return;

    // Only show meaningful shanten for 13-tile hands (standard draw phase)
    // For 14-tile hands, checkWin is more accurate
    let shantenText = '';
    let color = 'var(--gold)';
    let borderColor = '';
    let boxShadow = '';

    if (tiles.length === 14) {
      // Check actual win
      if (checkWin(tiles, player.melds)) {
        shantenText = ' · 胡! WIN!';
        color = 'var(--neon-win)';
        borderColor = 'rgba(57,255,20,0.5)';
        boxShadow = '0 0 12px rgba(57,255,20,0.3)';
      } else {
        shantenText = ' · Discard a tile';
        color = 'var(--amber)';
      }
    } else if (tiles.length === 13) {
      const shanten = calcShanten(tiles);
      if (shanten <= 0) {
        shantenText = ' · 聽牌 Tenpai!';
        color = 'var(--neon-win)';
        borderColor = 'rgba(57,255,20,0.5)';
        boxShadow = '0 0 12px rgba(57,255,20,0.3)';
      } else if (shanten <= 2) {
        shantenText = ` · ${shanten} tile${shanten>1?'s':''} away`;
        color = 'var(--amber)';
      }
    } else {
      // With melds, hand is smaller
      const shanten = calcShanten(tiles);
      if (shanten <= 0) {
        shantenText = ' · 聽牌!';
        color = 'var(--neon-win)';
        borderColor = 'rgba(57,255,20,0.5)';
        boxShadow = '0 0 12px rgba(57,255,20,0.3)';
      }
    }

    badge.textContent = WIND_NAMES[player.seatWind - 1] + ' Seat' + shantenText;
    badge.style.color = color;
    badge.style.borderColor = borderColor;
    badge.style.boxShadow = boxShadow;
  },

  renderPlayerHand() {
    const hand = document.getElementById('player-hand');
    hand.innerHTML = '';
    const player = STATE.players[0];
    const sorted = sortHand(player.hand);
    sorted.forEach((tile, idx) => {
      const el = renderTileEl(tile, 'lg', true, tile._selected, tile._justDrawn);
      el.addEventListener('click', () => this.tileClick(tile, el));
      hand.appendChild(el);
    });
  },

  renderPlayerMelds() {
    const meldDiv = document.getElementById('player-melds');
    meldDiv.innerHTML = '';
    for (const meld of STATE.players[0].melds) {
      const set = document.createElement('div');
      set.className = 'meld-set';
      const label = document.createElement('div');
      label.className = 'meld-label';
      label.textContent = meld.type.toUpperCase();
      set.appendChild(label);
      for (const t of meld.tiles) {
        set.appendChild(renderMiniTile(t, 'sm'));
      }
      meldDiv.appendChild(set);
    }
  },

  renderAI() {
    const aiSlots = [
      { playerIdx: 1, discardEl: 'ai-west-discards', countEl: 'ai-west-count', scoreEl: 'ai-west-score', areaId: 'ai-west' },
      { playerIdx: 2, discardEl: 'ai-north-discards', countEl: 'ai-north-count', scoreEl: 'ai-north-score', areaId: 'ai-north' },
      { playerIdx: 3, discardEl: 'ai-south-discards', countEl: 'ai-south-count', scoreEl: 'ai-south-score', areaId: 'ai-south' },
    ];
    for (const slot of aiSlots) {
      const p = STATE.players[slot.playerIdx];
      if (!p) continue;
      document.getElementById(slot.countEl).textContent = p.hand.length + (p.melds.length > 0 ? ` +${p.melds.length*3}` : '');
      document.getElementById(slot.scoreEl).textContent = STATE.scores[slot.playerIdx];
      const disc = document.getElementById(slot.discardEl);
      disc.innerHTML = '';
      const maxShow = 12;
      const start = Math.max(0, p.discards.length - maxShow);
      for (let i = start; i < p.discards.length; i++) {
        disc.appendChild(renderMiniTile(p.discards[i], 'xs'));
      }
      // Active turn highlight
      const area = document.getElementById(slot.areaId);
      area.classList.toggle('active-turn', STATE.currentTurn === slot.playerIdx);
    }
  },

  renderLastDiscard() {
    const el = document.getElementById('last-discard');
    el.innerHTML = '';
    if (STATE.lastDiscard) {
      el.appendChild(renderTileEl(STATE.lastDiscard, 'lg'));
    }
  },

  // ── Player Actions ───────────────────────────────────────

  tileClick(tile, el) {
    if (STATE.phase !== 'discard') return;
    const player = STATE.players[0];
    // Toggle selection
    player.hand.forEach(t => t._selected = false);
    tile._selected = true;
    this.renderPlayerHand();
    // Auto-confirm: clicking a tile discards it
    this.discardTile(0, tile);
  },

  playerDraw() {
    if (STATE.phase !== 'draw' || STATE.currentTurn !== 0 || STATE.animating) return;
    const tile = drawFromWall();
    if (!tile) { this.endGame('draw'); return; }

    tile._justDrawn = true;
    const player = STATE.players[0];
    player.hand.push(tile);
    this.extractBonus(player);

    STATE.phase = 'discard';
    tile._justDrawn = true;
    setTimeout(() => { tile._justDrawn = false; }, 400);

    this.renderGame();
    this.updateActionBar();
    this.setTurnText('Choose a tile to discard');
    this.checkWinCondition(0);
  },

  playerPong() {
    if (STATE.animating) return;
    const tile = STATE.lastDiscard;
    const discardBy = STATE.lastDiscardBy;
    if (!tile || discardBy === 0) return;
    const player = STATE.players[0];
    const matching = player.hand.filter(t => tileEqual(t, tile));
    if (matching.length < 2) return;

    this.showDeclarationToast('碰! PONG');
    // Remove 2 from hand, add meld
    player.hand = removeFirst(removeFirst(player.hand, tile), tile);
    player.melds.push({ type: 'pong', tiles: [tile, matching[0], matching[1]] });
    // Notify AI that discard was taken
    STATE.players[discardBy].discards.pop();
    STATE.lastDiscard = null;
    STATE.phase = 'discard';
    STATE.currentTurn = 0;

    this.renderGame();
    this.updateActionBar();
    this.setTurnText('Choose a tile to discard');
    this.dismissHint();
  },

  playerKong() {
    if (STATE.animating) return;
    const tile = STATE.lastDiscard;
    const discardBy = STATE.lastDiscardBy;
    if (!tile || discardBy === 0) return;
    const player = STATE.players[0];
    const matching = player.hand.filter(t => tileEqual(t, tile));
    if (matching.length < 3) return;

    this.showDeclarationToast('槓! KONG');
    player.hand = removeFirst(removeFirst(removeFirst(player.hand, tile), tile), tile);
    player.melds.push({ type: 'kong', tiles: [tile, matching[0], matching[1], matching[2]] });
    STATE.players[discardBy].discards.pop();
    STATE.lastDiscard = null;

    // Draw replacement tile from back of wall
    const replacement = drawFromWall();
    if (replacement) { replacement._justDrawn = true; player.hand.push(replacement); this.extractBonus(player); }

    STATE.phase = 'discard';
    STATE.currentTurn = 0;
    this.renderGame();
    this.updateActionBar();
    this.setTurnText('Choose a tile to discard (after Kong)');
    this.checkWinCondition(0);
    this.dismissHint();
  },

  playerChow() {
    if (STATE.animating) return;
    const tile = STATE.lastDiscard;
    const discardBy = STATE.lastDiscardBy;
    if (!tile || discardBy === 0) return; // Can't chow your own discard
    const player = STATE.players[0];
    const chows = findChowsWithTile(player.hand.filter(t=>!isBonus(t)), tile);
    if (chows.length === 0) return;

    if (chows.length === 1) {
      this.executeChow(chows[0], tile, discardBy);
    } else {
      // Show choice modal
      this.showChowModal(chows, tile, discardBy);
    }
  },

  showChowModal(chows, tile, discardBy) {
    const modal = document.getElementById('modal-chow');
    const opts = document.getElementById('chow-options');
    opts.innerHTML = '';
    // De-duplicate chow sequences by the ranks used
    const seen = new Set();
    for (const chow of chows) {
      const key = chow.map(t=>t.rank).sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      const btn = document.createElement('div');
      btn.className = 'chow-option';
      const tilesDiv = document.createElement('div');
      tilesDiv.className = 'chow-option-tiles';
      chow.sort((a,b)=>a.rank-b.rank).forEach(t => {
        const tEl = renderMiniTile(t, 'sm');
        if (t.id === tile.id) tEl.style.boxShadow = '0 0 8px var(--gold-glow)'; // highlight discard
        tilesDiv.appendChild(tEl);
      });
      btn.appendChild(tilesDiv);
      const label = document.createElement('span');
      label.style.cssText = 'font-size:12px;color:var(--text-dim);margin-left:8px';
      label.textContent = chow.map(t=>t.rank).sort((a,b)=>a-b).join('-');
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
        this.executeChow(chow, tile, discardBy);
      });
      opts.appendChild(btn);
    }
    modal.classList.remove('hidden');
    STATE.pendingChow = { chows, tile, discardBy };
  },

  cancelChow() {
    document.getElementById('modal-chow').classList.add('hidden');
    STATE.pendingChow = null;
  },

  executeChow(chowTiles, discardTile, discardBy) {
    this.showDeclarationToast('吃! CHOW');
    const player = STATE.players[0];
    // Remove the hand tiles in the chow (not the discard tile)
    const fromHand = chowTiles.filter(t => t.id !== discardTile.id);
    for (const t of fromHand) {
      const idx = player.hand.findIndex(h => h.id === t.id);
      if (idx !== -1) player.hand.splice(idx, 1);
    }
    const fullChow = [...fromHand, discardTile].sort((a,b)=>a.rank-b.rank);
    player.melds.push({ type: 'chow', tiles: fullChow });
    STATE.players[discardBy].discards.pop();
    STATE.lastDiscard = null;
    STATE.phase = 'discard';
    STATE.currentTurn = 0;
    this.renderGame();
    this.updateActionBar();
    this.setTurnText('Choose a tile to discard');
    this.dismissHint();
  },

  playerWin() {
    if (STATE.animating) return;
    const player = STATE.players[0];
    let handToCheck;
    let isTsumo;

    if (STATE.phase === 'discard') {
      // Self-draw win (tsumo) — hand already has 14 - 3*melds tiles
      handToCheck = [...player.hand];
      isTsumo = true;
    } else if (STATE.phase === 'claim' && STATE.lastDiscard) {
      // Win on discard
      handToCheck = [...player.hand, STATE.lastDiscard];
      isTsumo = false;
    } else {
      return;
    }

    const result = checkWin(handToCheck, player.melds);
    if (!result) {
      this.showHint('❌ Not a winning hand yet! Keep building.');
      return;
    }

    if (!isTsumo && STATE.lastDiscard) {
      player.hand.push(STATE.lastDiscard);
      STATE.players[STATE.lastDiscardBy].discards.pop();
    }
    this.executeWin(0, result, isTsumo, isTsumo ? null : STATE.lastDiscard);
  },

  checkWinCondition(playerIdx) {
    const player = STATE.players[playerIdx];
    // In discard phase player has full hand (already drew); in claim they need +lastDiscard
    const handToCheck = STATE.phase === 'claim' && STATE.lastDiscardBy !== playerIdx && STATE.lastDiscard
      ? [...player.hand, STATE.lastDiscard]
      : [...player.hand];
    const result = checkWin(handToCheck, player.melds);
    if (result) {
      if (playerIdx === 0) {
        const el = document.getElementById('btn-win');
        if (el) el.classList.remove('hidden');
      }
      return true;
    }
    return false;
  },

  executeWin(winnerIdx, result, isTsumo, discardTile) {
    STATE.animating = true;
    clearTimeout(STATE.aiThinkTimeout);

    const winner = STATE.players[winnerIdx];
    const fan = result.fan.fan;
    const baseScore = Math.pow(2, fan) * 4; // basic HK scoring
    const scored = baseScore;

    STATE.scores[winnerIdx] += scored;

    this.showWinScreen(winnerIdx, result, fan, scored, isTsumo);
  },

  showWinScreen(winnerIdx, result, fan, scored, isTsumo) {
    const isHuman = winnerIdx === 0;
    const winnerName = SEAT_NAMES[winnerIdx];
    const player = STATE.players[winnerIdx];

    document.getElementById('win-title').textContent = isHuman ? '胡牌!' : `${winnerName} 胡!`;
    document.getElementById('win-subtitle').textContent = isHuman
      ? (isTsumo ? '🀄 自摸 Tsumo — Self Draw Win!' : '🀄 榮和 Ron — Win on Discard!')
      : `${WIND_NAMES[player.seatWind-1]} player wins this round`;

    // Show winning hand tiles
    const winHand = document.getElementById('win-hand');
    winHand.innerHTML = '';

    // Show declared melds first
    for (const meld of player.melds) {
      const setEl = document.createElement('div');
      setEl.className = 'meld-set';
      const label = document.createElement('div');
      label.className = 'meld-label';
      label.textContent = meld.type.toUpperCase();
      setEl.appendChild(label);
      for (const t of meld.tiles) setEl.appendChild(renderTileEl(t, 'sm'));
      winHand.appendChild(setEl);
    }

    // Show hand tiles (from winning detection)
    if (result.pair) {
      // Show pair highlighted
      const pairEl = document.createElement('div');
      pairEl.className = 'meld-set';
      const pLabel = document.createElement('div');
      pLabel.className = 'meld-label';
      pLabel.textContent = 'PAIR';
      pairEl.appendChild(pLabel);
      result.pair.forEach(t => pairEl.appendChild(renderTileEl(t, 'sm')));
      winHand.appendChild(pairEl);
      // Show remaining melds
      for (const meld of result.melds) {
        const setEl = document.createElement('div');
        setEl.className = 'meld-set';
        const label = document.createElement('div');
        label.className = 'meld-label';
        label.textContent = meld.type.toUpperCase();
        setEl.appendChild(label);
        meld.tiles.forEach(t => setEl.appendChild(renderTileEl(t, 'sm')));
        winHand.appendChild(setEl);
      }
    } else {
      // Just show all hand tiles sorted
      sortHand(player.hand).forEach(t => winHand.appendChild(renderTileEl(t, 'sm')));
    }

    document.getElementById('win-score').textContent = `${fan} Fan · +${scored} pts`;

    // Score board
    const breakdown = document.getElementById('win-breakdown');
    breakdown.innerHTML = result.fan.breakdown.join(' · ') + '<br><br>' +
      '<b style="color:var(--gold)">Scores:</b><br>' +
      STATE.players.map((p, i) => {
        const marker = i === winnerIdx ? '🏆 ' : '';
        return `${marker}${SEAT_NAMES[i]}: ${STATE.scores[i]} pts`;
      }).join(' &nbsp;|&nbsp; ');

    // Particles!
    this.spawnParticles();
    this.showScreen('screen-win');
  },

  spawnParticles() {
    const container = document.getElementById('win-particles');
    container.innerHTML = '';
    const colors = [
      '#c8973a', '#ffb84d', '#39ff14', '#ff4444', '#5de88a', '#5da8e8'
    ];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.width = (4 + Math.random() * 8) + 'px';
      p.style.height = (8 + Math.random() * 16) + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = Math.random() * 1.5 + 's';
      p.style.animationDuration = (1.5 + Math.random() * 1) + 's';
      container.appendChild(p);
    }
  },

  // ── Action Bar ───────────────────────────────────────────

  updateActionBar() {
    const phase = STATE.phase;
    const turn = STATE.currentTurn;
    const player = STATE.players[0];
    const lastDiscard = STATE.lastDiscard;
    const discardBy = STATE.lastDiscardBy;

    const show = id => { const el = document.getElementById(id); if(el) el.classList.remove('hidden'); };
    const hide = id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); };

    hide('btn-draw'); hide('btn-pong'); hide('btn-kong');
    hide('btn-chow'); hide('btn-win'); hide('btn-pass');

    if (phase === 'draw' && turn === 0) {
      if (wallRemaining() > 0) show('btn-draw');
    }

    if (phase === 'claim' && lastDiscard && discardBy !== 0) {
      const handTiles = player.hand.filter(t => !isBonus(t));
      const matching = handTiles.filter(t => tileEqual(t, lastDiscard));

      // Pong: need 2 matching
      if (matching.length >= 2) {
        show('btn-pong');
        // Kong: need 3 matching
        if (matching.length >= 3) show('btn-kong');
      }

      // Chow: only from player immediately after discarder (left of discarder = nextTurn)
      // In HK Mahjong, any player can chow in some variants; here we allow it for human always
      const chows = findChowsWithTile(handTiles, lastDiscard);
      if (chows.length > 0) show('btn-chow');

      // Win on discard
      const handToCheck = [...player.hand, lastDiscard];
      if (checkWin(handToCheck, player.melds)) show('btn-win');

      // Pass button — always available in claim phase
      show('btn-pass');

      // Show hints
      this.showClaimHints(matching.length, chows.length, handToCheck);
    }

    if (phase === 'discard' && turn === 0) {
      // Check self-draw win (tsumo)
      if (checkWin(player.hand, player.melds)) {
        show('btn-win');
      }
    }
  },

  playerPass() {
    if (STATE.phase !== 'claim') return;
    this.dismissHint();
    // Continue to AI claim check or next turn
    this.processAIClaim(STATE.lastDiscardBy);
  },

  showClaimHints(pongCount, chowCount, hand14) {
    const hints = [];
    if (pongCount >= 2) hints.push(`💡 <b>Pong</b> — You have 2 matching tiles! Take it for a triplet.${pongCount >= 3 ? ' <b>Kong</b> available too!' : ''}`);
    if (chowCount > 0) hints.push(`💡 <b>Chow</b> — You can form a sequence with this tile.`);
    const winResult = checkWin(hand14, STATE.players[0].melds);
    if (winResult) hints.push(`🏆 <b>Win!</b> — Declare 胡 now! ${winResult.fan.fan} fan — ${winResult.fan.breakdown.join(', ')}`);

    if (hints.length > 0) {
      this.showHint(hints[0]);
    }
  },

  showHint(text) {
    const banner = document.getElementById('hint-banner');
    document.getElementById('hint-text').innerHTML = text;
    banner.classList.remove('hidden');
    clearTimeout(this._hintTimeout);
    this._hintTimeout = setTimeout(() => this.dismissHint(), 8000);
  },

  dismissHint() {
    document.getElementById('hint-banner').classList.add('hidden');
    clearTimeout(this._hintTimeout);
  },

  setTurnText(text) {
    document.getElementById('turn-text').textContent = text;
  },

  // ── Discard Logic ────────────────────────────────────────

  discardTile(playerIdx, tile) {
    if (STATE.animating) return;
    const player = STATE.players[playerIdx];
    const idx = player.hand.findIndex(t => t.id === tile.id);
    if (idx === -1) return;
    player.hand.splice(idx, 1);
    player.discards.push(tile);
    tile._selected = false;

    STATE.lastDiscard = tile;
    STATE.lastDiscardBy = playerIdx;

    // Track for AI
    for (const p of STATE.players) {
      if (p.ai) p.ai.trackDiscard(tile);
    }

    STATE.phase = 'claim';
    this.renderGame();
    this.renderLastDiscard();

    // Check if any player wants to claim
    this.processClaimPhase(playerIdx);
  },

  processClaimPhase(discardedBy) {
    // First check if human can claim
    if (discardedBy !== 0) {
      const canClaim = this.humanCanClaim();
      if (canClaim) {
        STATE.currentTurn = 0; // Human's chance to act
        this.updateActionBar();
        this.setTurnText(`Claim this tile?`);
        // Auto-timeout after a few seconds? No — wait for human
        return;
      }
    }

    // Otherwise AI claims
    this.processAIClaim(discardedBy);
  },

  humanCanClaim() {
    const tile = STATE.lastDiscard;
    if (!tile) return false;
    const player = STATE.players[0];
    const handTiles = player.hand.filter(t => !isBonus(t));
    const matching = handTiles.filter(t => tileEqual(t, tile));
    const chows = findChowsWithTile(handTiles, tile);
    const handWithDiscard = [...player.hand, tile];
    const canWin = checkWin(handWithDiscard, player.melds);
    return matching.length >= 2 || chows.length > 0 || !!canWin;
  },

  processAIClaim(discardedBy) {
    const tile = STATE.lastDiscard;
    if (!tile) return;

    // Check AI players for win first (priority), then pong
    const order = this.getTurnOrder(discardedBy);

    let claimedBy = -1;
    let claimType = null;

    for (const idx of order) {
      if (idx === discardedBy || idx === 0) continue;
      const p = STATE.players[idx];
      const handTiles = p.hand.filter(t => !isBonus(t));
      const matching = handTiles.filter(t => tileEqual(t, tile));
      const handWithDiscard = [...p.hand, tile];
      // Check win
      if (checkWin(handWithDiscard, p.melds)) {
        claimedBy = idx; claimType = 'win'; break;
      }
      // Check pong
      if (matching.length >= 2 && p.ai.shouldPong(p.hand, p.melds, tile, STATE.roundWind, p.seatWind)) {
        claimedBy = idx; claimType = 'pong'; break;
      }
    }

    // Check chow (only from player immediately after discarder)
    if (claimedBy === -1) {
      const nextIdx = (discardedBy + 1) % 4;
      if (nextIdx !== 0) {
        const p = STATE.players[nextIdx];
        const chows = findChowsWithTile(p.hand.filter(t=>!isBonus(t)), tile);
        if (chows.length > 0 && p.ai.shouldChow(p.hand, p.melds, tile)) {
          claimedBy = nextIdx; claimType = 'chow';
        }
      }
    }

    if (claimedBy !== -1) {
      STATE.animating = true;
      STATE.aiThinkTimeout = setTimeout(() => {
        STATE.animating = false;
        this.executeAIClaim(claimedBy, claimType, tile, discardedBy);
      }, 600 + Math.random() * 400);
    } else {
      // No claim — next player's turn
      this.advanceTurn(discardedBy);
    }
  },

  getTurnOrder(from) {
    const order = [];
    let i = (from + 1) % 4;
    while (i !== from) { order.push(i); i = (i + 1) % 4; }
    return order;
  },

  executeAIClaim(claimerIdx, type, tile, discardedBy) {
    const claimer = STATE.players[claimerIdx];
    STATE.players[discardedBy].discards.pop();
    STATE.lastDiscard = null;

    if (type === 'win') {
      const handWithTile = [...claimer.hand, tile];
      const result = checkWin(handWithTile, claimer.melds);
      if (!result) { this.advanceTurn(discardedBy); return; } // safety check
      claimer.hand.push(tile);
      STATE.scores[claimerIdx] += Math.pow(2, result.fan.fan) * 4;
      this.showDeclarationToast(`${SEAT_NAMES[claimerIdx]}: 胡! WINS!`);
      setTimeout(() => this.executeWin(claimerIdx, result, false, tile), 1200);
      return;
    }

    if (type === 'pong') {
      this.showDeclarationToast(`${SEAT_NAMES[claimerIdx]}: 碰 PONG`);
      const matching = claimer.hand.filter(t => tileEqual(t, tile));
      claimer.hand = removeFirst(removeFirst(claimer.hand, tile), tile);
      claimer.melds.push({ type:'pong', tiles:[tile, matching[0], matching[1]] });
      STATE.currentTurn = claimerIdx;
      STATE.phase = 'discard';
      this.renderGame();
      this.setTurnText(`${SEAT_NAMES[claimerIdx]} is thinking...`);
      this.scheduleAIDiscard(claimerIdx);
      return;
    }

    if (type === 'chow') {
      this.showDeclarationToast(`${SEAT_NAMES[claimerIdx]}: 吃 CHOW`);
      const chows = findChowsWithTile(claimer.hand.filter(t=>!isBonus(t)), tile);
      const chow = chows[0];
      const fromHand = chow.filter(t => !tileEqual(t, tile));
      for (const t of fromHand) {
        const idx = claimer.hand.findIndex(h => tileEqual(h, t));
        if (idx !== -1) claimer.hand.splice(idx, 1);
      }
      claimer.melds.push({ type:'chow', tiles:[...fromHand, tile].sort((a,b)=>a.rank-b.rank) });
      STATE.currentTurn = claimerIdx;
      STATE.phase = 'discard';
      this.renderGame();
      this.setTurnText(`${SEAT_NAMES[claimerIdx]} is thinking...`);
      this.scheduleAIDiscard(claimerIdx);
      return;
    }
  },

  advanceTurn(from) {
    STATE.lastDiscard = null;
    const next = (from + 1) % 4;
    STATE.currentTurn = next;

    if (wallRemaining() <= 0) {
      this.endGame('draw');
      return;
    }

    if (next === 0) {
      STATE.phase = 'draw';
      this.renderGame();
      this.updateActionBar();
      this.setTurnText('Your Turn — Draw a tile');
    } else {
      STATE.phase = 'draw';
      this.renderGame();
      this.setTurnText(`${SEAT_NAMES[next]} is drawing...`);
      this.scheduleAIDraw(next);
    }
  },

  scheduleAIDraw(playerIdx) {
    STATE.aiThinkTimeout = setTimeout(() => {
      if (STATE.currentTurn !== playerIdx) return;
      const tile = drawFromWall();
      if (!tile) { this.endGame('draw'); return; }
      const p = STATE.players[playerIdx];
      tile._justDrawn = true;
      p.hand.push(tile);
      this.extractBonus(p);

      // Check AI win (tsumo)
      const result = checkWin(p.hand, p.melds);
      if (result) {
        // AI always declares win when possible (it's winning, why wouldn't they?)
        this.showDeclarationToast(`${SEAT_NAMES[playerIdx]}: 胡! WINS!`);
        STATE.scores[playerIdx] += Math.pow(2, result.fan.fan) * 4;
        setTimeout(() => this.executeWin(playerIdx, result, true, null), 1200);
        return;
      }

      STATE.phase = 'discard';
      this.renderGame();
      this.setTurnText(`${SEAT_NAMES[playerIdx]} is thinking...`);
      this.scheduleAIDiscard(playerIdx);
    }, 400 + Math.random() * 600);
  },

  scheduleAIDiscard(playerIdx) {
    STATE.aiThinkTimeout = setTimeout(() => {
      if (STATE.currentTurn !== playerIdx) return;
      const p = STATE.players[playerIdx];
      const tile = p.ai.chooseDiscard(p.hand, p.melds, STATE.roundWind, p.seatWind);
      if (!tile) { this.advanceTurn(playerIdx); return; }
      this.discardTile(playerIdx, tile);
    }, 500 + Math.random() * 700);
  },

  endGame(reason) {
    clearTimeout(STATE.aiThinkTimeout);
    STATE.animating = false;
    if (reason === 'draw') {
      this.showDeclarationToast('流局 — Draw!');
      setTimeout(() => {
        this.showScreen('screen-win');
        document.getElementById('win-title').textContent = '流局';
        document.getElementById('win-subtitle').textContent = 'Wall exhausted — No winner this round';
        document.getElementById('win-hand').innerHTML = '';
        document.getElementById('win-score').textContent = 'Draw Game';
        document.getElementById('win-breakdown').innerHTML =
          'The wall is empty. No points awarded.<br><br>' +
          '<b style="color:var(--gold)">Scores:</b><br>' +
          STATE.players.map((p, i) => `${SEAT_NAMES[i]}: ${STATE.scores[i]} pts`).join(' &nbsp;|&nbsp; ');
        this.spawnParticles();
      }, 1500);
    }
  },

  showDeclarationToast(text) {
    const existing = document.querySelector('.decl-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'decl-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  },
};

// ── Utility ─────────────────────────────────────────────────

function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const suitOrder = { man:0, pin:1, sou:2, wind:3, dragon:4, flower:5, season:6 };
    const sa = suitOrder[a.suit] ?? 9;
    const sb = suitOrder[b.suit] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.rank - b.rank;
  });
}

// ── Help Content ─────────────────────────────────────────────

const HELP_CONTENT = {
  basics: `
    <div class="help-section">
      <h3>The Goal</h3>
      <p>Be the first player to complete a winning hand of 14 tiles: 4 sets (melds) + 1 pair, OR 7 different pairs.</p>
      <h3>The Wall</h3>
      <p>144 tiles are shuffled into a "wall." Each player starts with 13 tiles. On your turn, draw 1 tile from the wall, then discard 1.</p>
      <h3>Your Turn</h3>
      <ul>
        <li><b>Draw</b> — Take the top tile from the wall</li>
        <li><b>Discard</b> — Tap a tile in your hand to discard it</li>
        <li><b>Win (胡)</b> — If your hand is complete, declare 胡!</li>
      </ul>
      <h3>Other Players' Turns</h3>
      <p>When another player discards, you may be able to <b>Pong</b>, <b>Kong</b>, <b>Chow</b>, or <b>Win</b> on their discarded tile.</p>
      <h3>The Game Ends When...</h3>
      <ul>
        <li>A player declares 胡 (win) — they score points</li>
        <li>The wall runs out — it's a draw (流局), no points scored</li>
      </ul>
    </div>
  `,
  tiles: `
    <div class="help-section">
      <h3>The Three Suits</h3>
      <div class="tile-legend">
        <div class="tile-legend-item"><span class="tile-mini" style="color:#e85d5d">一 to 九</span><span>萬 Man (Characters) · 1–9</span></div>
        <div class="tile-legend-item"><span class="tile-mini" style="color:#5da8e8">① to ⑨</span><span>筒 Pin (Circles) · 1–9</span></div>
        <div class="tile-legend-item"><span class="tile-mini" style="color:#5de88a">1 to 9</span><span>索 Sou (Bamboo) · 1–9</span></div>
      </div>
      <h3>Honor Tiles</h3>
      <div class="tile-legend">
        <div class="tile-legend-item"><span class="tile-mini" style="color:#e8c85d">東南西北</span><span>Wind tiles (East, South, West, North)</span></div>
        <div class="tile-legend-item"><span class="tile-mini" style="color:#e8c85d">中發白</span><span>Dragon tiles (Red, Green, White)</span></div>
      </div>
      <p>Honor tiles cannot form sequences (chow). They can only form triplets (pong) or quads (kong).</p>
      <h3>Bonus Tiles</h3>
      <div class="tile-legend">
        <div class="tile-legend-item"><span class="tile-mini" style="color:#c85de8">梅蘭菊竹</span><span>Flowers (梅 Plum, 蘭 Orchid, 菊 Chrysanthemum, 竹 Bamboo)</span></div>
        <div class="tile-legend-item"><span class="tile-mini" style="color:#c85de8">春夏秋冬</span><span>Seasons (春 Spring, 夏 Summer, 秋 Autumn, 冬 Winter)</span></div>
      </div>
      <p>Bonus tiles are set aside when drawn. You immediately draw a replacement tile. They add fan (points) to your score.</p>
    </div>
  `,
  calls: `
    <div class="help-section">
      <h3>碰 Pong (Triplet)</h3>
      <p>When another player discards a tile that matches 2 tiles in your hand, you can declare <b>Pong</b> to take it and form a triplet. You then discard a tile. Any player can Pong.</p>
      <h3>槓 Kong (Quad)</h3>
      <p>When you have 3 tiles matching a discard, declare <b>Kong</b> to take all 4. You draw an extra replacement tile from the wall.</p>
      <h3>吃 Chow (Sequence)</h3>
      <p>Take a discarded tile to complete a sequence (e.g., 3-4-5 of the same suit). <b>Only works with suit tiles</b> (not honors). In HK rules, typically only the player to the discarder's left can Chow.</p>
      <h3>胡 Win (Ron/Tsumo)</h3>
      <p>Declare <b>胡</b> when your hand is complete:</p>
      <ul>
        <li><b>Ron</b> — Win on another player's discard</li>
        <li><b>Tsumo</b> — Win by drawing the winning tile yourself</li>
      </ul>
      <h3>Priority Order</h3>
      <p>When multiple players can claim: <b>Win</b> beats <b>Pong/Kong</b> beats <b>Chow</b>.</p>
    </div>
  `,
  hands: `
    <div class="help-section">
      <h3>Standard Winning Hand</h3>
      <p>4 melds (sets of 3) + 1 pair = 14 tiles total</p>
      <h3>Example Hands</h3>
      <div class="hand-example">
        <div class="hand-example-title">All Sequences (平和) — 1 fan</div>
        <p style="font-size:12px;color:#8a7a5a">e.g. [1-2-3 Pin] + [4-5-6 Pin] + [7-8-9 Pin] + [2-3-4 Man] + pair [5-5 Sou]</p>
      </div>
      <div class="hand-example">
        <div class="hand-example-title">All Triplets (對對和) — 3 fan</div>
        <p style="font-size:12px;color:#8a7a5a">e.g. Pong of East + Pong of 3 Man + Pong of 7 Pin + Pong of 5 Sou + pair [9-9 Man]</p>
      </div>
      <div class="hand-example">
        <div class="hand-example-title">Mixed One-Suit — 3 fan</div>
        <p style="font-size:12px;color:#8a7a5a">All tiles are one suit (say, all Man) PLUS honor tiles (winds/dragons)</p>
      </div>
      <div class="hand-example">
        <div class="hand-example-title">Pure One-Suit — 7 fan</div>
        <p style="font-size:12px;color:#8a7a5a">All tiles are exactly one suit, no honors</p>
      </div>
      <div class="hand-example">
        <div class="hand-example-title">Seven Pairs (七對子) — 4 fan</div>
        <p style="font-size:12px;color:#8a7a5a">7 different pairs — no melds needed, just 14 tiles forming 7 pairs</p>
      </div>
      <div class="hand-example">
        <div class="hand-example-title">All Honors — 10 fan</div>
        <p style="font-size:12px;color:#8a7a5a">All tiles are winds or dragons</p>
      </div>
    </div>
  `,
  scoring: `
    <div class="help-section">
      <h3>The Fan System</h3>
      <p>Hands are scored in <b>fan</b> (翻). More fan = more points. Points double with each fan!</p>
      <table class="fan-table">
        <thead><tr><th>Hand / Feature</th><th>Fan</th></tr></thead>
        <tbody>
          <tr><td>Chicken Hand (minimum)</td><td>1</td></tr>
          <tr><td>All Sequences (平和)</td><td>1</td></tr>
          <tr><td>All Triplets (對對和)</td><td>3</td></tr>
          <tr><td>Seven Pairs (七對子)</td><td>4</td></tr>
          <tr><td>Mixed One-Suit</td><td>3</td></tr>
          <tr><td>Pure One-Suit</td><td>7</td></tr>
          <tr><td>All Honors</td><td>10</td></tr>
          <tr><td>Dragon Triplet (each)</td><td>+1</td></tr>
          <tr><td>Wind Triplet (each)</td><td>+1</td></tr>
          <tr><td>Dragon Pair</td><td>+1</td></tr>
          <tr><td>Kong (each)</td><td>+1</td></tr>
        </tbody>
      </table>
      <h3>Points</h3>
      <p>Base points = 4 × 2^fan. So 1 fan = 8 pts, 2 fan = 16 pts, 3 fan = 32 pts, etc.</p>
    </div>
  `,
  strategy: `
    <div class="help-section">
      <h3>Beginner Tips</h3>
      <ul>
        <li>Start by identifying your pairs and sequences, then discard isolated tiles (honor tiles with no matches)</li>
        <li>Keep connected tiles (e.g., 4 and 6 Man — you need a 5 to complete the sequence)</li>
        <li>Dragon and wind triplets give bonus fan — don't discard them lightly</li>
      </ul>
      <h3>Defense</h3>
      <ul>
        <li>Watch what other players are NOT discarding — that tells you what they need</li>
        <li>Safe tiles: tiles already discarded by others are usually safe to play</li>
        <li>Dangerous tiles: 2–8 in suits can complete many sequences for opponents</li>
        <li>On Hard difficulty, the AI tracks discards and defends — be careful!</li>
      </ul>
      <h3>When to Chow vs Pong</h3>
      <ul>
        <li>Pong breaks opponents' plans — they can't use that tile</li>
        <li>Chow is faster for building sequences, but only gives 1 fan (min)</li>
        <li>If you have 2 matching honors, always Pong — those tiles are rare</li>
      </ul>
      <h3>Reading Tenpai</h3>
      <p>Tenpai (聽牌) means you're one tile away from winning. At this point, be careful what you discard — you don't want to give opponents their winning tile!</p>
    </div>
  `,
};

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.setDifficulty('medium');
  App.showHelpTab('basics');
  // Show menu
  App.showScreen('screen-menu');
});

// Handle page visibility (pause AI when hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearTimeout(STATE.aiThinkTimeout);
  }
});
