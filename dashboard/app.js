// Token Launch Radar — the page. It reads window.RADAR (written beside dashboard/ by main.ts from
// the same board board.json carries) and renders four views from the hash: the ranked board
// (#/board, filterable and sortable), a detail view for every protocol (#/detail/<slug>) with the
// model's own arithmetic and the protocol's farm plan, the live-token protocols the radar sets
// aside (#/live), and the model itself with a sandbox (#/method). No network: every byte it shows
// is in data.js. The farm plan generator below is the page's copy of lib/model.ts's farmSteps, and
// the build test proves the two produce the same steps for every row.
(function () {
  'use strict';
  var DATA = window.RADAR;
  var app = document.getElementById('app');
  var foot = document.getElementById('foot');
  if (!DATA || !app) return;
  var M = DATA.model;

  // ---------- formatting ----------
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtAge(d) {
    if (d === null || d === undefined) return 'unknown';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(d)) + 'd';
  }
  function fmtMult(n) { return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0') + 'x'; }

  // ---------- the farm plan generator: the page's copy of lib/model.ts's ----------
  function chainOf(r) { return r.chains.length > 0 ? r.chains[0] : 'its main chain'; }
  function capitalFor(r) {
    if (r.tvl_usd >= 1e9) return 250;
    if (r.tvl_usd >= 250e6) return 200;
    if (r.tvl_usd >= 100e6) return 150;
    if (r.tvl_usd >= 25e6) return 100;
    return 50;
  }
  function gasFor(chain) {
    if (chain === 'Ethereum') return 10;
    if (chain === 'Solana') return 1;
    var l2 = ['Base', 'Arbitrum', 'Optimism', 'Polygon', 'Linea', 'Scroll', 'zkSync Era', 'Mantle', 'Blast', 'Mode'];
    return l2.indexOf(chain) >= 0 ? 2 : 4;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function has(c, words) { for (var i = 0; i < words.length; i++) if (c.indexOf(words[i]) >= 0) return true; return false; }
  function actionFor(r, capital, chain) {
    var c = (r.category || '').toLowerCase(), name = r.name;
    if (has(c, ['lend', 'cdp', 'collateral'])) return 'Supply $' + capital + ' of USDC as collateral in ' + name + ' on ' + chain + ' and borrow $' + Math.round(capital / 2) + ' of a stablecoin against it, keeping the loan-to-value under 50%';
    if (has(c, ['curator', 'allocator', 'manager'])) return 'Deposit $' + capital + ' of USDC into a ' + name + ' vault on ' + chain + ' and keep the vault shares in the wallet';
    if (has(c, ['dex', 'liquidity'])) return 'Provide $' + capital + ' split evenly between USDC and the pool\'s paired asset in ' + name + '\'s main ' + chain + ' pool and keep the LP position open';
    if (has(c, ['derivative', 'perpetual', 'options'])) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position, half long and half short, so the account stays active without directional risk';
    if (has(c, ['basis'])) return 'Deposit $' + capital + ' of USDC into ' + name + '\'s basis vault on ' + chain + ' and keep the shares while the funding position runs';
    if (has(c, ['prediction'])) return 'Fund the account with $' + capital + ' and place one position in ' + name + '\'s most liquid market, then hold it to settlement';
    if (has(c, ['rwa', 'real world'])) return 'Mint $' + capital + ' of ' + name + '\'s yield-bearing asset on ' + chain + ' through its own app and hold the asset in the wallet';
    if (has(c, ['privacy'])) return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and make one shielded transfer between your own wallets';
    if (has(c, ['staking', 'anchor', 'restak'])) return 'Stake $' + capital + ' of the chain\'s native asset through ' + name + ' on ' + chain + ' and keep the staking receipt in the wallet';
    if (has(c, ['bridge', 'cross chain'])) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and put the bridged funds to work in one app on the far side';
    if (has(c, ['insurance'])) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' for a position you already hold and keep the policy to expiry';
    if (has(c, ['yield', 'aggregator', 'farm'])) return 'Deposit $' + capital + ' of USDC into ' + name + '\'s highest-TVL vault on ' + chain + ' and keep the shares in the wallet';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' through its own app and keep the position open';
  }
  function secondActionFor(r, chain) {
    var c = (r.category || '').toLowerCase(), name = r.name;
    if (has(c, ['lend', 'cdp', 'collateral'])) return 'Repay a small part of the loan and borrow again once, so the account shows both sides of ' + name + '\'s market';
    if (has(c, ['dex', 'liquidity'])) return 'Make two swaps through ' + name + '\'s own interface on ' + chain + ', one each way, rather than through an aggregator';
    if (has(c, ['curator', 'allocator', 'manager'])) return 'Move a quarter of the position into a second ' + name + ' vault with a different strategy, so the account holds two vaults';
    if (has(c, ['derivative', 'perpetual', 'options'])) return 'Close the hedge and open a fresh one a week later, so the account shows repeat trading activity on ' + name;
    if (has(c, ['prediction'])) return 'Place one position in a second market on ' + name + ' and hold both to settlement';
    return 'Repeat the opening action once more with a small top-up, so the account shows two separate deposits in ' + name;
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s += ' Hold the position and check the protocol\'s own page.';
    return s;
  }
  function farmStepsFor(r) {
    var chain = chainOf(r), capital = capitalFor(r), gas = gasFor(chain), hold = holdDaysFor(r.age_days);
    return [
      { text: 'Open a fresh wallet for ' + r.name + ' that holds only the funds you plan to farm, fund it from your main wallet, and keep its seed phrase offline on paper', cost: 'about $' + gas + ' of gas to fund and make the first transaction on ' + chain, time: '10 minutes' },
      { text: actionFor(r, capital, chain), cost: '$' + capital + ' of capital plus about $' + (gas * 2) + ' of gas for the deposit transactions', time: '20 minutes to set up' },
      { text: secondActionFor(r, chain), cost: 'about $' + gas + ' of gas, with no new capital beyond the first position', time: '10 minutes' },
      { text: 'Return once a week and make one small qualifying action in ' + r.name + ' — a deposit, a repayment, a swap or a vote — so the wallet reads as an active user', cost: 'about $' + gas + ' of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days without withdrawing, so the activity stands in more than one weekly snapshot of the protocol', cost: 'the $' + capital + ' stays in the position and cannot be spent meanwhile', time: hold + ' days' },
      { text: 'Before you withdraw, check ' + r.name + '\'s own points or rewards page and claim only from the link the protocol itself publishes; then log the wallet, the dates and every transaction hash in a farm log', cost: 'nothing to check, and never pay a fee to claim', time: '15 minutes' }
    ].map(stepText);
  }
  // A step string back into its parts, for the detail view's chips.
  function stepParts(s) {
    var i = s.indexOf(' Cost: '), j = s.lastIndexOf('. Time: ');
    if (i < 0 || j < 0) return { text: s, cost: '', time: '' };
    return { text: s.slice(0, i), cost: s.slice(i + 7, j), time: s.slice(j + 8).replace(/\.$/, '') };
  }

  // ---------- the model, recomputed in the page for the sandbox ----------
  function impliedOf(r, scale, gw, mr) {
    var g = Math.min(M.growth_cap, Math.max(M.growth_floor, r.change_7d === null || r.change_7d === undefined ? 0 : r.change_7d));
    var gm = 1 + (g / 100) * gw;
    var age = r.age_days === null || r.age_days === undefined ? M.unknown_age_days : r.age_days;
    var mm = M.maturity_floor + (Math.min(Math.max(age, 0), M.maturity_days) / M.maturity_days) * mr;
    return Math.max(1, Math.round(r.tvl_usd * r.category_multiple * scale * gm * mm));
  }

  // ---------- routing ----------
  function parseHash() {
    var h = window.location.hash.replace(/^#\/?/, '');
    var q = h.indexOf('?');
    var path = q >= 0 ? h.slice(0, q) : h;
    var params = new URLSearchParams(q >= 0 ? h.slice(q + 1) : '');
    var seg = path.split('/').filter(Boolean);
    return { view: seg[0] || 'board', slug: seg[1] ? decodeURIComponent(seg[1]) : null, params: params };
  }
  function markTabs(view) {
    var links = document.querySelectorAll('#tabs a');
    for (var i = 0; i < links.length; i++) links[i].classList.toggle('on', links[i].getAttribute('data-view') === view);
  }
  function bySlug(slug) {
    for (var i = 0; i < DATA.rows.length; i++) if (DATA.rows[i].slug === slug) return DATA.rows[i];
    return null;
  }

  // ---------- board ----------
  var boardState = { q: '', cat: 'all', chain: 'all', set: 'all', sort: 'implied', dir: -1 };
  function uniqSorted(values) {
    var seen = {}, out = [];
    values.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out.sort();
  }
  function filteredRows() {
    var st = boardState;
    var rows = DATA.rows.filter(function (r) {
      if (st.set === 'watchlist' && r.tier !== 'watchlist') return false;
      if (st.set === 'early' && r.tier !== 'early') return false;
      if (st.cat !== 'all' && (r.category || '(none)') !== st.cat) return false;
      if (st.chain !== 'all' && r.chains.indexOf(st.chain) < 0) return false;
      if (st.q && (r.name + ' ' + r.slug).toLowerCase().indexOf(st.q.toLowerCase()) < 0) return false;
      return true;
    });
    var key = { rank: 'rank', tvl: 'tvl_usd', change: 'change_7d', age: 'age_days', implied: 'implied_value_usd', mult: 'category_multiple' }[st.sort] || 'implied_value_usd';
    rows.sort(function (a, b) {
      var x = a[key], y = b[key];
      if (x === null || x === undefined) x = -Infinity;
      if (y === null || y === undefined) y = -Infinity;
      return (x - y) * st.dir || (a.slug < b.slug ? -1 : 1);
    });
    return rows;
  }
  function rowHtml(r, maxImplied) {
    var chg = r.change_7d === null ? '<span class="mut">n/a</span>' : '<span class="' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</span>';
    var chains = r.chains.slice(0, 2).join(', ') + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '');
    var pct = Math.max(2, Math.round((r.implied_value_usd / maxImplied) * 100));
    return '<tr data-slug="' + esc(r.slug) + '"' + (r.rank <= 3 ? ' class="top"' : '') + '>' +
      '<td class="rank">' + r.rank + '</td>' +
      '<td><span class="pname">' + esc(r.name) + '</span><span class="pslug">' + esc(r.slug) + '</span></td>' +
      '<td><span class="badge ' + (r.tier === 'watchlist' ? 'wl' : 'early') + '">' + (r.tier === 'watchlist' ? 'WATCHLIST' : 'EARLY') + '</span></td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td class="chains">' + esc(chains || '—') + '</td>' +
      '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
      '<td class="num">' + chg + '</td>' +
      '<td class="num">' + fmtAge(r.age_days) + '</td>' +
      '<td class="num"><span class="implied">' + fmtUsd(r.implied_value_usd) + '</span><span class="bar"><i style="width:' + pct + '%"></i></span></td>' +
      '<td class="num mut">' + fmtMult(r.category_multiple) + '</td></tr>';
  }
  function renderRows() {
    var rows = filteredRows();
    var maxI = rows.reduce(function (m, r) { return Math.max(m, r.implied_value_usd); }, 1);
    var body = document.getElementById('board-body');
    var count = document.getElementById('board-count');
    if (body) body.innerHTML = rows.map(function (r) { return rowHtml(r, maxI); }).join('') || '<tr><td colspan="10" class="mut">No protocol matches this filter.</td></tr>';
    if (count) count.innerHTML = 'Showing <b>' + rows.length + '</b> of ' + DATA.board_size + ' ranked protocols';
    var heads = document.querySelectorAll('th.sortable');
    for (var i = 0; i < heads.length; i++) {
      var k = heads[i].getAttribute('data-sort');
      heads[i].innerHTML = heads[i].getAttribute('data-label') + (boardState.sort === k ? ' <span class="dir">' + (boardState.dir === -1 ? '▾' : '▴') + '</span>' : '');
    }
  }
  function statStrip() {
    return '<section class="stats">' +
      '<div class="stat"><b>' + DATA.scanned_size + '</b><span>protocols scanned</span></div>' +
      '<div class="stat warm"><b>' + DATA.watchlist_size + '</b><span>on the watchlist</span></div>' +
      '<div class="stat hot"><b>' + DATA.board_size + '</b><span>ranked on the board</span></div>' +
      '<div class="stat"><b>' + DATA.early_size + '</b><span>early finds below the floor</span></div>' +
      '<div class="stat"><b>' + fmtUsd(DATA.total_implied_usd) + '</b><span>total implied value</span></div>' +
      '<div class="stat"><b>' + DATA.live_size + '</b><span>live tokens set aside</span></div></section>';
  }
  // The board's own receipts, recomputed from the rows on this page each time it renders: the
  // ranks, the order, the watchlist count and the total are checked, not just printed. Below it,
  // how the scanned protocols divide — every figure from the snapshot's own counts.
  function ledgerStrip() {
    var rows = DATA.rows.slice().sort(function (a, b) { return a.rank - b.rank; });
    var ranksOk = rows.every(function (r, i) { return r.rank === i + 1; });
    var mono = true;
    for (var i = 1; i < rows.length; i++) if (rows[i].implied_value_usd > rows[i - 1].implied_value_usd) mono = false;
    var wl = rows.filter(function (r) { return r.tier === 'watchlist'; }).length;
    var sum = rows.reduce(function (n, r) { return n + r.implied_value_usd; }, 0);
    var chip = function (ok, text) { return '<span class="lchip' + (ok ? '' : ' bad') + '">' + (ok ? '✓' : '✗') + ' ' + text + '</span>'; };
    var aside = DATA.scanned_size - DATA.board_size;
    return '<section class="ledger"><div class="lrow">' +
      chip(rows.length === DATA.board_size, 'this page is the board the program wrote — ' + rows.length + ' of ' + DATA.board_size + ' rows') +
      chip(ranksOk && mono, 'ranks 1–' + rows.length + ' in order, implied values never rise') +
      chip(wl === DATA.watchlist_size, 'watchlist ' + wl + ' of ' + DATA.watchlist_size + ' ranked') +
      chip(sum === DATA.total_implied_usd, 'rows sum to the stated total, ' + fmtUsd(DATA.total_implied_usd) + ' implied') +
      '</div>' +
      '<p class="account">How the ' + DATA.scanned_size + ' scanned protocols divide: <b>' + DATA.board_size + ' ranked here</b> (' + DATA.watchlist_size + ' watchlist + ' + DATA.early_size + ' early finds below the floor) · <b>' + aside + ' set aside</b> — they already record a token, or are a wrapped, staked, bridged or exchange product of one that does; the ' + DATA.live_size + ' largest live tokens are kept as the model\'s comps on the Live tokens view.</p></section>';
  }
  function renderBoard(params) {
    boardState = {
      q: params.get('q') || '', cat: params.get('cat') || 'all', chain: params.get('chain') || 'all',
      set: params.get('set') || 'all', sort: params.get('sort') || 'implied', dir: params.get('dir') === 'asc' ? 1 : -1
    };
    var cats = uniqSorted(DATA.rows.map(function (r) { return r.category || '(none)'; }));
    var chains = uniqSorted(DATA.rows.reduce(function (a, r) { return a.concat(r.chains); }, []));
    var opt = function (v, cur, label) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label || v) + '</option>'; };
    app.innerHTML = statStrip() + ledgerStrip() +
      '<div class="controls">' +
      '<label>Search <input type="search" id="f-q" value="' + esc(boardState.q) + '" placeholder="name or slug"></label>' +
      '<label>Set <select id="f-set">' + opt('all', boardState.set, 'Whole board') + opt('watchlist', boardState.set, 'Watchlist only') + opt('early', boardState.set, 'Early only') + '</select></label>' +
      '<label>Category <select id="f-cat">' + opt('all', boardState.cat, 'All categories') + cats.map(function (c) { return opt(c, boardState.cat); }).join('') + '</select></label>' +
      '<label>Chain <select id="f-chain">' + opt('all', boardState.chain, 'All chains') + chains.map(function (c) { return opt(c, boardState.chain); }).join('') + '</select></label>' +
      '<span class="count" id="board-count"></span></div>' +
      '<table><thead><tr>' +
      '<th class="sortable" data-sort="rank" data-label="#">#</th><th>Protocol</th><th>Set</th><th>Category</th><th>Chains</th>' +
      '<th class="num sortable" data-sort="tvl" data-label="TVL">TVL</th>' +
      '<th class="num sortable" data-sort="change" data-label="7d">7d</th>' +
      '<th class="num sortable" data-sort="age" data-label="Age">Age</th>' +
      '<th class="num sortable" data-sort="implied" data-label="Implied value">Implied value</th>' +
      '<th class="num sortable" data-sort="mult" data-label="Comp x">Comp x</th>' +
      '</tr></thead><tbody id="board-body"></tbody></table>' +
      '<p class="small mut">Implied value is model ' + esc(DATA.model_version) + '\'s claim: TVL x the category\'s own market multiple, adjusted for 7-day growth and for how long the protocol has run with no token recorded. Click any row for its detail view and farm plan. WATCHLIST rows clear the snapshot\'s $' + (DATA.floor_usd / 1e6) + 'M floor; EARLY rows are the radar\'s finds below it.</p>';
    renderRows();
    document.getElementById('f-q').addEventListener('input', function (e) { boardState.q = e.target.value; renderRows(); });
    document.getElementById('f-set').addEventListener('change', function (e) { boardState.set = e.target.value; renderRows(); });
    document.getElementById('f-cat').addEventListener('change', function (e) { boardState.cat = e.target.value; renderRows(); });
    document.getElementById('f-chain').addEventListener('change', function (e) { boardState.chain = e.target.value; renderRows(); });
    var heads = document.querySelectorAll('th.sortable');
    for (var i = 0; i < heads.length; i++) heads[i].addEventListener('click', function () {
      var k = this.getAttribute('data-sort');
      if (boardState.sort === k) boardState.dir = -boardState.dir; else { boardState.sort = k; boardState.dir = k === 'rank' ? 1 : -1; }
      renderRows();
    });
    document.getElementById('board-body').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-slug]');
      if (tr) window.location.hash = '#/detail/' + encodeURIComponent(tr.getAttribute('data-slug'));
    });
  }

  // ---------- detail ----------
  function renderDetail(slug) {
    var r = bySlug(slug);
    if (!r) { app.innerHTML = '<p>No protocol with that slug is on the board. <a href="#/board">Back to the board</a></p>'; return; }
    var steps = farmStepsFor(r).map(function (s) {
      var p = stepParts(s);
      return '<li>' + esc(p.text) + '<span class="meta"><span class="chip">Cost <b>' + esc(p.cost) + '</b></span><span class="chip">Time <b>' + esc(p.time) + '</b></span></span></li>';
    }).join('');
    var peers = DATA.rows.filter(function (x) { return x.category === r.category && x.slug !== r.slug; }).slice(0, 5);
    var peersHtml = peers.length ? peers.map(function (x) {
      return '<tr><td><a href="#/detail/' + encodeURIComponent(x.slug) + '">' + esc(x.name) + '</a></td><td class="num">' + fmtUsd(x.tvl_usd) + '</td><td class="num">' + fmtUsd(x.implied_value_usd) + '</td></tr>';
    }).join('') : '<tr><td class="mut">No other ranked protocol shares this category.</td></tr>';
    var comps = DATA.live.filter(function (x) { return x.category === r.category; }).slice(0, 5);
    var compsHtml = comps.length ? comps.map(function (x) {
      return '<tr><td>' + esc(x.name) + (x.symbol ? ' <span class="mut">' + esc(x.symbol) + '</span>' : '') + '</td><td class="num">' + fmtUsd(x.mcap_usd) + '</td><td class="num">' + fmtUsd(x.tvl_usd) + '</td><td class="num">' + (x.tvl_usd > 0 && x.mcap_usd ? fmtMult(x.mcap_usd / x.tvl_usd) : 'n/a') + '</td></tr>';
    }).join('') : '<tr><td class="mut">None of the top live tokens shares this category; the model used the global median multiple.</td></tr>';
    var nbrs = DATA.rows.filter(function (x) { return Math.abs(x.rank - r.rank) <= 2; }).sort(function (a, b) { return a.rank - b.rank; });
    var nbrsHtml = nbrs.map(function (x) {
      var d = x.implied_value_usd - r.implied_value_usd;
      var dtxt = x.slug === r.slug ? 'this row' : (d > 0 ? '+' : '-') + fmtUsd(Math.abs(d));
      return '<tr' + (x.slug === r.slug ? ' class="me"' : '') + '><td>' + x.rank + '</td><td><a href="#/detail/' + encodeURIComponent(x.slug) + '">' + esc(x.name) + '</a></td><td class="num">' + fmtUsd(x.implied_value_usd) + '</td><td class="num mut">' + dtxt + '</td></tr>';
    }).join('');
    var catLine = null;
    DATA.categories.forEach(function (c) { if (c.category === (r.category || '(none)')) catLine = c; });
    var compNote = r.comps >= M.min_comps
      ? 'the median of ' + r.comps + ' live ' + esc(r.category || '') + ' protocols'
      : 'the global median — only ' + r.comps + ' live comp' + (r.comps === 1 ? '' : 's') + ' in this category';
    app.innerHTML =
      '<a class="back" href="#/board">&larr; Back to the board</a>' +
      '<div class="detail-head"><h2>' + esc(r.name) + '</h2>' +
      '<span class="badge ' + (r.tier === 'watchlist' ? 'wl' : 'early') + '">' + (r.tier === 'watchlist' ? 'WATCHLIST' : 'EARLY FIND') + '</span>' +
      '<span class="sub">Rank #' + r.rank + ' of ' + DATA.board_size + ' &middot; ' + esc(r.category || 'Uncategorised') + ' &middot; ' + esc(r.chains.join(', ') || 'no chains recorded') + '</span></div>' +
      '<div class="detail-grid"><div>' +
      '<section class="card"><h3>The record <span class="mut">— as the snapshot carries it</span></h3><div class="kv">' +
      '<div><b>' + fmtUsd(r.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div><b>' + fmtPct(r.change_7d) + '</b><span>TVL change, 7d</span></div>' +
      '<div><b>' + fmtAge(r.age_days) + '</b><span>tracked, no token</span></div>' +
      '<div><b>' + (r.listed_at || 'n/a') + '</b><span>first tracked</span></div>' +
      '<div><b>' + r.chains.length + '</b><span>chains</span></div>' +
      '<div><b>none recorded</b><span>token</span></div></div>' +
      '<p class="small mut">DefiLlama\'s record for ' + esc(r.name) + ' carries no token: no market cap, no CoinGecko id, no symbol. That is a statement about the record, not proof none exists.</p></section>' +
      '<section class="card"><h3>Why this value <span class="mut">— model ' + esc(DATA.model_version) + ', every input from the snapshot</span></h3>' +
      '<p class="formula">' + fmtUsd(r.tvl_usd) + ' <span class="op">x</span> ' + fmtMult(r.category_multiple) + ' <span class="op">x</span> ' + r.growth_multiplier.toFixed(2) + ' <span class="op">x</span> ' + r.maturity_multiplier.toFixed(2) + ' <span class="op">=</span> <span class="res">' + fmtUsd(r.implied_value_usd) + '</span></p>' +
      '<table class="mini"><tr><th>Input</th><th>Value</th><th>Where it comes from</th></tr>' +
      '<tr><td>Category multiple</td><td>' + fmtMult(r.category_multiple) + '</td><td>' + compNote + '</td></tr>' +
      '<tr><td>Growth multiplier</td><td>' + r.growth_multiplier.toFixed(2) + '</td><td>7d TVL change of ' + fmtPct(r.change_7d) + ', clamped to ' + M.growth_floor + '%..+' + M.growth_cap + '%, weight ' + M.growth_weight + '</td></tr>' +
      '<tr><td>Maturity multiplier</td><td>' + r.maturity_multiplier.toFixed(2) + '</td><td>' + (r.age_days === null ? 'age unknown, counted as ' + M.unknown_age_days + ' days' : fmtAge(r.age_days) + ' tracked with no token, on a ' + M.maturity_days + '-day curve') + '</td></tr></table>' +
      '<h3 style="margin-top:14px">Live comps in this category <span class="mut">— the market\'s own values</span></h3>' +
      '<table class="mini"><tr><th>Protocol</th><th class="num">Market cap</th><th class="num">TVL</th><th class="num">x TVL</th></tr>' + compsHtml + '</table></section>' +
      '<section class="card"><h3>Around this rank <span class="mut">— the board either side of #' + r.rank + '</span></h3>' +
      '<table class="mini"><tr><th>#</th><th>Protocol</th><th class="num">Implied</th><th class="num">vs this row</th></tr>' + nbrsHtml + '</table></section>' +
      '</div><div>' +
      '<section class="card"><h3>Farm plan <span class="mut">— six steps, costs and times stated</span></h3><ol class="plan">' + steps + '</ol>' +
      '<p class="small mut">A plan is a starting position, not advice: sizes come from the protocol\'s own TVL tier, gas from its first chain. Never pay a fee to claim a reward, and claim only from links the protocol itself publishes.</p></section>' +
      '<section class="card"><h3>Also ranked in ' + esc(r.category || 'this category') + '</h3>' +
      '<table class="mini"><tr><th>Protocol</th><th class="num">TVL</th><th class="num">Implied</th></tr>' + peersHtml + '</table></section>' +
      '</div></div>';
  }

  // ---------- live tokens ----------
  function renderLive() {
    var rows = DATA.live.map(function (x, i) {
      var chg = x.change_7d === null ? '<span class="mut">n/a</span>' : '<span class="' + (x.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(x.change_7d) + '</span>';
      return '<tr data-slug=""><td class="rank">' + (i + 1) + '</td><td><span class="pname">' + esc(x.name) + '</span><span class="pslug">' + esc(x.slug) + (x.symbol ? ' &middot; ' + esc(x.symbol) : '') + '</span></td>' +
        '<td>' + esc(x.category || '—') + '</td><td class="chains">' + esc(x.chains.slice(0, 2).join(', ')) + '</td>' +
        '<td class="num">' + fmtUsd(x.mcap_usd) + '</td><td class="num">' + fmtUsd(x.tvl_usd) + '</td>' +
        '<td class="num mut">' + (x.tvl_usd > 0 && x.mcap_usd ? fmtMult(x.mcap_usd / x.tvl_usd) : 'n/a') + '</td><td class="num">' + chg + '</td></tr>';
    }).join('');
    app.innerHTML = '<div class="detail-head"><h2>Live tokens, set aside</h2><span class="sub">These protocols already trade. The radar never ranks them; their market caps are the comps the value model reads.</span></div>' +
      '<table><thead><tr><th>#</th><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">Market cap</th><th class="num">TVL</th><th class="num">x TVL</th><th class="num">7d</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="small mut">The top ' + DATA.live_size + ' live-token protocols by market cap, of every live protocol in the snapshot. Exchange (CEX) records are left out, as the radar leaves them out of its comps story: their caps price a company, not a protocol\'s TVL.</p>';
    var body = app.querySelector('tbody');
    if (body) body.style.cursor = 'default';
  }

  // ---------- model & method ----------
  function renderMethod() {
    var catRows = DATA.categories.map(function (c) {
      return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.comps + '</td><td class="num">' + fmtMult(c.multiple) + '</td><td>' + (c.comps >= M.min_comps ? 'category median' : '<span class="mut">global median (too few comps)</span>') + '</td></tr>';
    }).join('');
    app.innerHTML = '<div class="detail-head"><h2>Model &amp; method</h2><span class="sub">Model ' + esc(DATA.model_version) + ' — stated in full, and live below: move the sliders and the board re-ranks.</span></div>' +
      '<div class="method-grid">' +
      '<section class="card"><h3>The question</h3><p>What would a token be worth if a protocol that records none issued one at its current size? The radar reads the sealed snapshot — every protocol DefiLlama tracked at $5M of TVL or more on ' + esc(DATA.as_of) + ' — keeps the ones that record no token and are not a wrapped, staked or bridged product of one that trades, and ranks them by the value the model below implies. It does not predict that any of them will issue a token.</p>' +
      '<h3 style="margin-top:12px">The watchlist is the floor</h3><p>The snapshot\'s watchlist holds the ' + DATA.watchlist_size + ' pre-token protocols at or above its $' + (DATA.floor_usd / 1e6) + 'M TVL floor. The board covers every one, then keeps going: ' + DATA.early_size + ' more rankable pre-token protocols below the floor, held to the same definition.</p></section>' +
      '<section class="card"><h3>The value model</h3><div class="eq">implied = TVL x category multiple x growth x maturity</div>' +
      '<ul class="tight"><li><b>Category multiple</b> — the median market-cap-per-TVL of the live protocols in the same category: the market\'s own price for a dollar of TVL there, clamped to ' + M.multiple_floor + 'x..' + M.multiple_cap + 'x. A category with fewer than ' + M.min_comps + ' comps takes the global median, ' + fmtMult(DATA.global_multiple) + '.</li>' +
      '<li><b>Growth</b> — 1 + clamp(7d TVL change, ' + M.growth_floor + '%, +' + M.growth_cap + '%) x ' + M.growth_weight + '.</li>' +
      '<li><b>Maturity</b> — ' + M.maturity_floor + ' + min(age in days, ' + M.maturity_days + ') / ' + M.maturity_days + ' x ' + M.maturity_range + '; an unknown age counts as ' + M.unknown_age_days + ' days. Running longer with no token is worth more, not less: the record is proven, the launch still ahead.</li>' +
      '<li><b>No name is special-cased.</b> One function scores every row from its own record: TVL, growth, age, category.</li></ul></section>' +
      '<section class="card wide"><h3>Try the model <span class="mut">— the board\'s top 15 under your constants</span></h3>' +
      '<div class="slider-row"><label>Category multiple scale</label><input type="range" id="s-scale" min="0.25" max="3" step="0.05" value="1"><output id="o-scale">1.00x</output></div>' +
      '<div class="slider-row"><label>Growth weight</label><input type="range" id="s-gw" min="0" max="1" step="0.05" value="' + M.growth_weight + '"><output id="o-gw">' + M.growth_weight.toFixed(2) + '</output></div>' +
      '<div class="slider-row"><label>Maturity range</label><input type="range" id="s-mr" min="0" max="0.8" step="0.05" value="' + M.maturity_range + '"><output id="o-mr">' + M.maturity_range.toFixed(2) + '</output></div>' +
      '<div id="sandbox-out"></div></section>' +
      '<section class="card wide"><h3>Category multiples <span class="mut">— derived from the snapshot\'s live protocols</span></h3>' +
      '<div class="scroll"><table class="mini"><tr><th>Category</th><th class="num">Live comps</th><th class="num">Multiple used</th><th>Basis</th></tr>' + catRows + '</table></div></section>' +
      '<section class="card wide"><h3>Read this board honestly</h3><div class="note">The snapshot says a protocol <b>records</b> no token; a record can lag a launch, so treat every row as a claim about DefiLlama\'s record on ' + esc(DATA.as_of) + ', not about the world. An implied value is this entry\'s own model claim, never a price prediction, and a farm plan is a starting position, not financial advice.</div></section>' +
      '</div>';
    var draw = function () {
      var scale = parseFloat(document.getElementById('s-scale').value);
      var gw = parseFloat(document.getElementById('s-gw').value);
      var mr = parseFloat(document.getElementById('s-mr').value);
      document.getElementById('o-scale').textContent = scale.toFixed(2) + 'x';
      document.getElementById('o-gw').textContent = gw.toFixed(2);
      document.getElementById('o-mr').textContent = mr.toFixed(2);
      var ranked = DATA.rows.map(function (r) { return { r: r, v: impliedOf(r, scale, gw, mr) }; })
        .sort(function (a, b) { return b.v - a.v || (a.r.slug < b.r.slug ? -1 : 1); }).slice(0, 15);
      document.getElementById('sandbox-out').innerHTML = '<table class="mini"><tr><th>#</th><th>Protocol</th><th class="num">Implied under your constants</th><th class="num">Board\'s implied</th></tr>' +
        ranked.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td><a href="#/detail/' + encodeURIComponent(x.r.slug) + '">' + esc(x.r.name) + '</a></td><td class="num">' + fmtUsd(x.v) + '</td><td class="num mut">' + fmtUsd(x.r.implied_value_usd) + '</td></tr>'; }).join('') + '</table>';
    };
    ['s-scale', 's-gw', 's-mr'].forEach(function (id) { document.getElementById(id).addEventListener('input', draw); });
    draw();
  }

  // ---------- shell ----------
  function render() {
    var route = parseHash();
    markTabs(route.view === 'detail' ? 'board' : route.view);
    if (route.view === 'detail' && route.slug) renderDetail(route.slug);
    else if (route.view === 'live') renderLive();
    else if (route.view === 'method') renderMethod();
    else renderBoard(route.params);
    app.setAttribute('aria-busy', 'false');
    window.scrollTo(0, 0);
  }
  foot.innerHTML = 'Built from the sealed snapshot: ' + esc(DATA.source) + '. Board, detail and farm plans are generated by the entry\'s program from that snapshot alone — no network, no live prices. Implied values are the model\'s claims, not predictions.';
  window.addEventListener('hashchange', render);
  render();
})();
