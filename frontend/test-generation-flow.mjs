// Smoke test for the GeneratingView flow.
// Run: node frontend/test-generation-flow.mjs
import { spawn } from 'node:child_process';

function runScenario(scenario) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', ['../backend/simulate_flow.py', scenario]);
    let out = '';
    let err = '';
    py.stdout.on('data', (c) => (out += c));
    py.stderr.on('data', (c) => (err += c));
    py.on('close', (code) => {
      if (code !== 0) return reject(new Error(err));
      resolve(JSON.parse(out));
    });
  });
}

// Replica da logica do useEffect em GeneratingView (PostResult.tsx)
function applyResponses(responses) {
  const state = {
    currentTaskId: null,
    isGenerating: false,
    currentStep: '',
    progress: 0,
    result: null,
    errorMsg: null,
  };

  if (responses[0]?.task_id) {
    state.currentTaskId = responses[0].task_id;
    state.isGenerating = true;
  }

  for (const ts of responses.slice(1)) {
    if (!ts) continue;
    if (ts.status === 'processing' || ts.status === 'pending') {
      state.currentStep = ts.current_step || 'Processando...';
      state.progress = ts.progress;
    } else if (ts.status === 'completed') {
      const r = ts.result;
      if (r?.posts_data?.length > 0) {
        state.result = { id: Number(state.currentTaskId) || 0, posts_data: r.posts_data };
        state.isGenerating = false;
        state.currentTaskId = null;
      } else {
        state.errorMsg = 'concluida sem posts';
        state.isGenerating = false;
        state.currentTaskId = null;
      }
    } else if (ts.status === 'failed') {
      state.errorMsg = ts.error || 'Erro na geracao';
      state.isGenerating = false;
      state.currentTaskId = null;
    } else if (ts.status === 'cancelled') {
      state.errorMsg = 'Geracao cancelada';
      state.isGenerating = false;
      state.currentTaskId = null;
    }
  }
  return state;
}

// Ordem NOVA (depois do fix): result -> errorMsg -> noTask -> loading
function pickViewFixed(s) {
  if (s.result) return 'POST_DISPLAYED';
  if (s.errorMsg) return 'ERROR_VIEW';
  if (!s.currentTaskId && !s.isGenerating) return 'NO_TASK_VIEW';
  return 'LOADING_VIEW';
}

// Ordem ANTIGA (com bug): result -> noTask -> errorMsg -> loading
// Quando a task termina, clearGeneration zera currentTaskId, e o noTask
// é avaliado ANTES do errorMsg, escondendo o erro do usuario.
function pickViewBuggy(s) {
  if (s.result) return 'POST_DISPLAYED';
  if (!s.currentTaskId && !s.isGenerating) return 'NO_TASK_VIEW';
  if (s.errorMsg) return 'ERROR_VIEW';
  return 'LOADING_VIEW';
}

let failures = 0;
function assert(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${label}: ${actual}${ok ? '' : `  (expected ${expected})`}`);
  if (!ok) failures++;
}

async function main() {
  console.log('\n=== happy_path ===');
  const happy = applyResponses(await runScenario('happy_path'));
  console.log('  state:', JSON.stringify({
    result: happy.result ? `posts=${happy.result.posts_data.length}` : null,
    errorMsg: happy.errorMsg,
    progress: happy.progress,
  }));
  assert('happy path -> fixed order shows post', pickViewFixed(happy), 'POST_DISPLAYED');
  assert('happy path -> buggy order also shows post', pickViewBuggy(happy), 'POST_DISPLAYED');

  console.log('\n=== failure_path ===');
  const fail = applyResponses(await runScenario('failure_path'));
  console.log('  state:', JSON.stringify({
    result: fail.result,
    errorMsg: fail.errorMsg,
  }));
  assert('failure path -> fixed order shows error', pickViewFixed(fail), 'ERROR_VIEW');
  assert('failure path -> buggy order would show no-task (BUG!)', pickViewBuggy(fail), 'NO_TASK_VIEW');

  console.log('\n=== manual cancellation ===');
  const cancel = applyResponses([
    { task_id: 'abc-123', status: 'processing' },
    { task_id: 'abc-123', status: 'cancelled', current_step: 'Cancelado', progress: 50, result: null, error: null },
  ]);
  assert('cancelled -> fixed order shows error', pickViewFixed(cancel), 'ERROR_VIEW');
  assert('cancelled -> buggy order would show no-task (BUG!)', pickViewBuggy(cancel), 'NO_TASK_VIEW');

  console.log('');
  if (failures > 0) {
    console.log(`${failures} assertion(s) failed.`);
    process.exit(1);
  } else {
    console.log('All assertions passed.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
