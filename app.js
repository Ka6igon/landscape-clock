(() => {
  'use strict';
  const cities = [
    { id: 'tokyo', name: '東京', zone: 'Asia/Tokyo' }, { id: 'sydney', name: 'シドニー', zone: 'Australia/Sydney' },
    { id: 'honolulu', name: 'ホノルル', zone: 'Pacific/Honolulu' }, { id: 'la', name: 'ロサンゼルス', zone: 'America/Los_Angeles' },
    { id: 'ny', name: 'ニューヨーク', zone: 'America/New_York' }, { id: 'london', name: 'ロンドン', zone: 'Europe/London' },
    { id: 'paris', name: 'パリ', zone: 'Europe/Paris' }, { id: 'dubai', name: 'ドバイ', zone: 'Asia/Dubai' }, { id: 'singapore', name: 'シンガポール', zone: 'Asia/Singapore' }
  ];
  const storage = { get(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }, set(key, value) { localStorage.setItem(key, JSON.stringify(value)); } };
  const state = {
    tab: 'world', cityIds: storage.get('landscape-clock-cities', ['tokyo', 'ny', 'london']),
    alarms: storage.get('landscape-clock-alarms', [{ id: 1, hour: 7, minute: 0, label: 'アラーム', days: ['月','火','水','木','金'], enabled: true }, { id: 2, hour: 8, minute: 30, label: '予定', days: [], enabled: false }]),
    stopwatch: { running: false, elapsed: 0, startedAt: 0, laps: [], analog: false }, timers: [], editingCities: false
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pad = value => String(value).padStart(2, '0');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const formatter = (zone, options) => new Intl.DateTimeFormat('ja-JP', { timeZone: zone, ...options });
  const timeFor = (zone) => formatter(zone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  const dateFor = (zone) => formatter(zone, { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date());
  const partsFor = zone => Object.fromEntries(formatter(zone, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const hoursIn = zone => +partsFor(zone).hour;
  const offsetText = zone => {
    const now = new Date(); const local = now.getTimezoneOffset() * -1;
    const values = formatter(zone, { timeZoneName: 'shortOffset', hour: 'numeric' }).formatToParts(now); const part = values.find(v => v.type === 'timeZoneName')?.value || 'GMT';
    const m = part.match(/GMT([+-])(\d+)(?::(\d+))?/); if (!m) return '同じ時間';
    const offset = (m[1] === '+' ? 1 : -1) * (+m[2] * 60 + +(m[3] || 0)); const diff = offset - local;
    if (!diff) return '同じ時間'; return `${diff > 0 ? '+' : '−'}${Math.abs(diff / 60)}時間`;
  };
  function setTab(tab) {
    state.tab = tab;
    $$('.tab').forEach(b => b.classList.toggle('is-selected', b.dataset.tab === tab));
    $$('.view').forEach(view => { const active = view.dataset.view === tab; view.hidden = !active; view.classList.toggle('is-active', active); });
    const meta = { world:['世界時計','世界時計','都市を追加','＋'], alarm:['アラーム','アラーム','アラームを追加','＋'], stopwatch:['ストップウォッチ','ストップウォッチ','表示を切り替え','◐'], timer:['タイマー','タイマー','タイマーを追加','＋'] }[tab];
    $('#header-eyebrow').textContent = meta[0]; $('#view-title').textContent = meta[1]; $('#header-action').setAttribute('aria-label', meta[2]); $('#header-action').title = meta[2]; $('#header-action').textContent = meta[3];
  }
  function renderWorld() {
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    $('#local-time').textContent = timeFor(localZone); $('#local-date').textContent = dateFor(localZone);
    $('#clock-list').innerHTML = state.cityIds.map(id => {
      const city = cities.find(item => item.id === id); if (!city) return '';
      const nowHour = hoursIn(city.zone); const isTomorrow = nowHour < +partsFor(localZone).hour;
      return `<article class="clock-row" data-city="${city.id}">${state.editingCities ? `<button class="remove-city" data-remove-city="${city.id}" type="button" aria-label="${city.name}を削除">−</button>` : ''}<span class="clock-diff">${offsetText(city.zone)}</span><div class="clock-name"><strong>${city.name}</strong><span>${isTomorrow ? '明日' : '今日'}、${dateFor(city.zone)}</span></div><time class="clock-time">${timeFor(city.zone)}</time></article>`;
    }).join('');
  }
  function renderAlarms() {
    $('#alarm-list').innerHTML = state.alarms.sort((a,b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)).map(alarm => `<article class="alarm-row ${alarm.enabled ? '' : 'is-disabled'}"><div class="alarm-details"><div class="alarm-time">${pad(alarm.hour)}:${pad(alarm.minute)}</div><div class="alarm-meta">${alarm.days.length ? alarm.days.join('・') : '繰り返しなし'}${alarm.label ? `　${escapeHTML(alarm.label)}` : ''}</div></div><input class="switch" data-alarm-id="${alarm.id}" aria-label="${pad(alarm.hour)}時${pad(alarm.minute)}分のアラーム" type="checkbox" ${alarm.enabled ? 'checked' : ''}/></article>`).join('');
  }
  function renderStopwatch() {
    const now = performance.now(); const elapsed = state.stopwatch.running ? state.stopwatch.elapsed + now - state.stopwatch.startedAt : state.stopwatch.elapsed;
    const centis = Math.floor(elapsed / 10) % 100; const seconds = Math.floor(elapsed / 1000) % 60; const minutes = Math.floor(elapsed / 60000) % 60; const hours = Math.floor(elapsed / 3600000);
    $('#stopwatch-readout').textContent = `${hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
    const max = Math.max(...state.stopwatch.laps.map(l => l.split), 0), min = Math.min(...state.stopwatch.laps.map(l => l.split), Infinity);
    $('#lap-list').innerHTML = state.stopwatch.laps.slice().reverse().map((lap, i) => `<div class="lap-row ${lap.split === min && state.stopwatch.laps.length > 1 ? 'best' : lap.split === max && state.stopwatch.laps.length > 1 ? 'worst' : ''}"><span>ラップ ${state.stopwatch.laps.length - i}</span><span>${formatStopwatch(lap.split)}</span></div>`).join('');
    $('#stopwatch-start').textContent = state.stopwatch.running ? '停止' : state.stopwatch.elapsed ? '再開' : '開始'; $('#stopwatch-start').classList.toggle('stop', state.stopwatch.running); $('#stopwatch-start').classList.toggle('start', !state.stopwatch.running);
    $('#lap-button').textContent = state.stopwatch.running ? 'ラップ' : state.stopwatch.elapsed ? 'リセット' : 'ラップ'; $('#lap-button').disabled = !state.stopwatch.running && !state.stopwatch.elapsed;
    const secRotation = (elapsed / 1000 % 60) * 6, minuteRotation = (elapsed / 60000 % 60) * 6; $('#second-hand').style.transform = `rotate(${secRotation}deg)`; $('#minute-hand').style.transform = `rotate(${minuteRotation}deg)`;
  }
  function formatStopwatch(ms) { const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000); return `${h ? `${pad(h)}:` : ''}${pad(m)}:${pad(s)}.${pad(cs)}`; }
  function formatTimer(ms) { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60; return `${h ? `${pad(h)}:` : ''}${pad(m)}:${pad(sec)}`; }
  function renderTimers() { $('#active-timers').innerHTML = state.timers.map(timer => { const remaining = timer.running ? timer.endAt - Date.now() : timer.remaining; const ratio = Math.max(0, remaining / timer.duration); return `<article class="timer-card ${remaining <= 0 ? 'timer-done' : ''}" data-timer-id="${timer.id}"><div class="timer-card-top"><div><div class="timer-remaining">${remaining <= 0 ? '完了' : formatTimer(remaining)}</div><p class="timer-label">${timer.label}</p></div><div class="timer-control">${remaining > 0 ? `<button class="timer-pause" type="button">${timer.running ? '一時停止' : '再開'}</button>` : ''}<button class="cancel" type="button">削除</button></div></div><div class="timer-progress"><i style="transform:scaleX(${ratio})"></i></div></article>`; }).join(''); }
  function showNotice(title, copy) { $('#notice-title').textContent = title; $('#notice-copy').textContent = copy; $('#notice-modal').showModal(); }
  function openCityModal() { $('#city-select').innerHTML = cities.filter(c => !state.cityIds.includes(c.id)).map(c => `<option value="${c.id}">${c.name}</option>`).join('') || '<option>追加できる都市はありません</option>'; $('#city-modal').showModal(); }
  function openAlarmModal() { $('#alarm-hour').value = new Date().getHours(); $('#alarm-minute').value = 0; $('#alarm-label').value = ''; $$('.repeat-days input').forEach(i => i.checked = false); $('#alarm-modal').showModal(); }
  function ensureAudio() { try { const AudioContext = window.AudioContext || window.webkitAudioContext; if (!window.clockAudio) window.clockAudio = new AudioContext(); return window.clockAudio; } catch { return null; } }
  function ringTimer(timer) { const context = ensureAudio(); if (context) { for (let i = 0; i < 3; i++) { const osc = context.createOscillator(), gain = context.createGain(); osc.frequency.value = 880; gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.16, context.currentTime + i * .35 + .02); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + i * .35 + .25); osc.connect(gain).connect(context.destination); osc.start(context.currentTime + i * .35); osc.stop(context.currentTime + i * .35 + .26); } } navigator.vibrate?.([220,100,220]); if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification('タイマー完了', { body: timer.label }); }
  function tick() { renderWorld(); state.timers.forEach(timer => { if (timer.running && timer.endAt <= Date.now()) { timer.running = false; timer.remaining = 0; ringTimer(timer); showNotice('タイマー完了', timer.label); } }); renderTimers(); }
  function animateStopwatch() { renderStopwatch(); if (state.stopwatch.running) requestAnimationFrame(animateStopwatch); }
  $$('.tab').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));
  $('#header-action').addEventListener('click', () => { if (state.tab === 'world') openCityModal(); else if (state.tab === 'alarm') openAlarmModal(); else if (state.tab === 'stopwatch') $('#dial-toggle').click(); else $('#timer-hours').focus(); });
  $('[data-action="add-alarm"]').addEventListener('click', openAlarmModal); $('[data-action="sleep-info"]').addEventListener('click', () => showNotice('睡眠｜起床', 'ブラウザ版では睡眠スケジュールの自動連携には対応していません。通常のアラームはこの画面から追加できます。'));
  $('[data-action="edit-cities"]').addEventListener('click', event => { state.editingCities = !state.editingCities; event.currentTarget.textContent = state.editingCities ? '完了' : '編集'; renderWorld(); });
  $('#clock-list').addEventListener('click', event => { const id = event.target.dataset.removeCity; if (!id) return; const row = event.target.closest('.clock-row'); row.classList.add('removing'); setTimeout(() => { state.cityIds = state.cityIds.filter(cityId => cityId !== id); storage.set('landscape-clock-cities', state.cityIds); renderWorld(); }, 180); });
  $('#save-city').addEventListener('click', event => { const id = $('#city-select').value; if (cities.some(c => c.id === id) && !state.cityIds.includes(id)) { event.preventDefault(); state.cityIds.push(id); storage.set('landscape-clock-cities', state.cityIds); renderWorld(); $('#city-modal').close(); } });
  $('#save-alarm').addEventListener('click', event => { event.preventDefault(); const hour = Math.min(23, Math.max(0, +$('#alarm-hour').value || 0)); const minute = Math.min(59, Math.max(0, +$('#alarm-minute').value || 0)); state.alarms.push({ id: Date.now(), hour, minute, label: $('#alarm-label').value.trim() || 'アラーム', days: $$('.repeat-days input:checked').map(i => i.value), enabled: true }); storage.set('landscape-clock-alarms', state.alarms); renderAlarms(); $('#alarm-modal').close(); });
  $('#alarm-list').addEventListener('change', event => { if (!event.target.matches('.switch')) return; const alarm = state.alarms.find(a => a.id === +event.target.dataset.alarmId); if (alarm) { alarm.enabled = event.target.checked; storage.set('landscape-clock-alarms', state.alarms); renderAlarms(); } });
  $('#stopwatch-start').addEventListener('click', () => { ensureAudio(); if (state.stopwatch.running) { state.stopwatch.elapsed += performance.now() - state.stopwatch.startedAt; state.stopwatch.running = false; renderStopwatch(); } else { state.stopwatch.startedAt = performance.now(); state.stopwatch.running = true; animateStopwatch(); } });
  $('#lap-button').addEventListener('click', () => { if (state.stopwatch.running) { const total = state.stopwatch.elapsed + performance.now() - state.stopwatch.startedAt; const last = state.stopwatch.laps.at(-1)?.total || 0; state.stopwatch.laps.push({ total, split: total - last }); } else { state.stopwatch = { running:false, elapsed:0, startedAt:0, laps:[], analog:state.stopwatch.analog }; } renderStopwatch(); });
  $('#dial-toggle').addEventListener('click', () => { state.stopwatch.analog = !state.stopwatch.analog; $('#analog-dial').classList.toggle('is-hidden', !state.stopwatch.analog); $('#stopwatch-readout').classList.toggle('is-hidden', state.stopwatch.analog); $('#dial-toggle').textContent = state.stopwatch.analog ? 'デジタル表示' : 'アナログ表示'; });
  $('#start-timer').addEventListener('click', () => { const h = Math.min(23, Math.max(0, +$('#timer-hours').value || 0)), m = Math.min(59, Math.max(0, +$('#timer-minutes').value || 0)), s = Math.min(59, Math.max(0, +$('#timer-seconds').value || 0)); const duration = (h * 3600 + m * 60 + s) * 1000; if (!duration) return showNotice('時間を設定してください', '1秒以上のタイマーを設定してください。'); ensureAudio(); if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); state.timers.unshift({ id: Date.now(), duration, remaining: duration, endAt: Date.now() + duration, running: true, label: h ? `${h}時間 ${m}分` : m ? `${m}分` : `${s}秒` }); renderTimers(); });
  $$('.timer-presets button').forEach(button => button.addEventListener('click', () => { const seconds = +button.dataset.preset; $('#timer-hours').value = 0; $('#timer-minutes').value = Math.floor(seconds / 60); $('#timer-seconds').value = seconds % 60; }));
  $('#active-timers').addEventListener('click', event => { const card = event.target.closest('.timer-card'); if (!card) return; const timer = state.timers.find(t => t.id === +card.dataset.timerId); if (!timer) return; if (event.target.classList.contains('cancel')) { state.timers = state.timers.filter(t => t !== timer); } if (event.target.classList.contains('timer-pause')) { if (timer.running) { timer.remaining = Math.max(0, timer.endAt - Date.now()); timer.running = false; } else { timer.endAt = Date.now() + timer.remaining; timer.running = true; } } renderTimers(); });
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
  renderWorld(); renderAlarms(); renderStopwatch(); renderTimers(); setInterval(tick, 250);
})();
