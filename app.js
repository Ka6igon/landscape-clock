(() => {
  'use strict';

  const MAX_MS = (99 * 60 * 60 + 59 * 60 + 59) * 1000 + 990;
  const state = {
    running: false,
    elapsedBeforeStart: 0,
    startedAt: 0,
    activeLapNumber: 0,
    activeLapStartedAt: 0,
    laps: []
  };

  const readout = document.querySelector('#stopwatch-readout');
  const lapList = document.querySelector('#lap-list');
  const lapResetButton = document.querySelector('#lap-reset-button');
  const startStopButton = document.querySelector('#start-stop-button');
  const pad = value => String(value).padStart(2, '0');

  function totalElapsed() {
    if (!state.running) return state.elapsedBeforeStart;
    return Math.min(MAX_MS, state.elapsedBeforeStart + performance.now() - state.startedAt);
  }

  function formatTime(milliseconds) {
    const centiseconds = Math.floor(milliseconds / 10) % 100;
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const minutes = Math.floor(milliseconds / 60000) % 60;
    const hours = Math.floor(milliseconds / 3600000);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  }

  function hasMeasurement() {
    return state.activeLapNumber > 0 || state.elapsedBeforeStart > 0;
  }

  function renderLaps(total) {
    lapList.replaceChildren();
    if (!state.activeLapNumber) {
      const empty = document.createElement('p');
      empty.className = 'empty-laps';
      empty.textContent = '開始するとラップ 1 の計測が表示されます';
      lapList.append(empty);
      return;
    }

    const addRow = (number, elapsed, active) => {
      const row = document.createElement('div');
      row.className = `lap-row${active ? ' is-active' : ''}`;
      const name = document.createElement('span');
      name.className = 'lap-name';
      name.textContent = `ラップ ${number}`;
      if (active && state.running) {
        const label = document.createElement('small');
        label.className = 'lap-state';
        label.textContent = '計測中';
        name.append(label);
      }
      const time = document.createElement('time');
      time.className = 'lap-time';
      time.textContent = formatTime(elapsed);
      row.append(name, time);
      lapList.append(row);
    };

    addRow(state.activeLapNumber, total - state.activeLapStartedAt, true);
    [...state.laps].reverse().forEach(lap => addRow(lap.number, lap.elapsed, false));
  }

  function render() {
    const total = totalElapsed();
    readout.textContent = formatTime(total);
    renderLaps(total);

    const measurable = hasMeasurement();
    lapResetButton.disabled = !state.running && !measurable;
    lapResetButton.textContent = state.running ? 'ラップ' : 'リセット';
    lapResetButton.setAttribute('aria-label', state.running ? 'ラップを記録' : 'ストップウォッチをリセット');
    startStopButton.textContent = state.running ? '停止' : '開始';
    startStopButton.classList.toggle('start', !state.running);
    startStopButton.classList.toggle('stop', state.running);
    startStopButton.setAttribute('aria-label', state.running ? '計測を停止' : '計測を開始');
  }

  function animate() {
    if (totalElapsed() >= MAX_MS) {
      state.elapsedBeforeStart = MAX_MS;
      state.running = false;
      render();
      return;
    }
    render();
    if (state.running) requestAnimationFrame(animate);
  }

  function start() {
    if (state.elapsedBeforeStart >= MAX_MS) reset();
    if (!state.activeLapNumber) {
      state.activeLapNumber = 1;
      state.activeLapStartedAt = state.elapsedBeforeStart;
    }
    state.startedAt = performance.now();
    state.running = true;
    animate();
  }

  function stop() {
    state.elapsedBeforeStart = totalElapsed();
    state.running = false;
    render();
  }

  function recordLap() {
    if (!state.running) return;
    const total = totalElapsed();
    state.laps.push({ number: state.activeLapNumber, elapsed: total - state.activeLapStartedAt });
    state.activeLapNumber += 1;
    state.activeLapStartedAt = total;
    render();
  }

  function reset() {
    state.running = false;
    state.elapsedBeforeStart = 0;
    state.startedAt = 0;
    state.activeLapNumber = 0;
    state.activeLapStartedAt = 0;
    state.laps = [];
    render();
  }

  startStopButton.addEventListener('click', () => { if (state.running) stop(); else start(); });
  lapResetButton.addEventListener('click', () => { if (state.running) recordLap(); else reset(); });
  document.addEventListener('visibilitychange', () => render());
  window.addEventListener('orientationchange', () => requestAnimationFrame(render));
  window.addEventListener('resize', () => requestAnimationFrame(render));

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('service-worker.js').catch(() => {}));
  render();
})();
