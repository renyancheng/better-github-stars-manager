import puppeteer from 'puppeteer';

function resolveHeadlessMode() {
  const raw = process.env.PUPPETEER_HEADLESS?.trim().toLowerCase();
  if (raw === '0' || raw === 'false') return false;
  if (raw === '1' || raw === 'true') return true;
  if (raw === 'new') return 'new';
  return process.env.CI ? 'new' : false;
}

function resolveExecutablePath() {
  return process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
}

export async function launchExtensionBrowser({ dist, userDataDir }) {
  const args = [
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    '--no-first-run',
    '--no-default-browser-check',
  ];

  if (process.env.CI) {
    args.push('--disable-dev-shm-usage', '--no-sandbox');
  }

  return puppeteer.launch({
    headless: resolveHeadlessMode(),
    executablePath: resolveExecutablePath(),
    userDataDir,
    args,
  });
}
