// Dynamic loader for recharts with caching

let rechartsPromise: Promise<any> | null = null;

export async function loadRecharts() {
  if (!rechartsPromise) {
    rechartsPromise = import('recharts');
  }
  return rechartsPromise;
}

export async function loadRechartsComponents() {
  const mod = await loadRecharts();
  return mod;
}

export async function preloadRecharts() {
  try {
    await loadRecharts();
  } catch (e) {
    console.warn('Failed to preload Recharts modules:', e);
  }
}

