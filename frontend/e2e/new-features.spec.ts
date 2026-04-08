import { test, expect, type Page, type Browser } from '@playwright/test';

/**
 * Helper: Creates a room with host + player2, starts game, and advances to a specified phase.
 * Returns both pages and contexts for cleanup.
 */
async function setupTwoPlayerGame(browser: Browser) {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const host = await ctx1.newPage();
  const player2 = await ctx2.newPage();

  // Host creates room
  await host.goto('/');
  await host.getByPlaceholder('Dit navn').fill('Alice');
  await host.getByRole('button', { name: 'Opret spil' }).click();
  await expect(host).toHaveURL('/lobby');
  const code = await host.getByTestId('room-code').textContent();

  // Player 2 joins
  await player2.goto('/');
  await player2.getByPlaceholder('Dit navn').fill('Bob');
  await player2.getByPlaceholder('Indtast rumkode').fill(code!);
  await player2.getByRole('button', { name: 'Deltag i spil' }).click();
  await expect(player2).toHaveURL('/lobby');

  await expect(host.getByText('Bob')).toBeVisible({ timeout: 5000 });

  return { host, player2, ctx1, ctx2, code: code! };
}

async function startGameWithTimer(host: Page, preset: 'Kort' | 'Normal' | 'Lang') {
  // Expand timer settings
  await host.getByRole('button', { name: /Tidsbegrænsning/ }).click();
  // Select timer preset (use getByText to avoid matching the toggle button)
  await host.getByText(new RegExp(`^${preset} \\(`)).click();
  // Start game
  await host.getByRole('button', { name: 'Start spillet' }).click();
}

async function playFullGame(host: Page, player2: Page) {
  // Round 0: WORD
  await expect(host.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 10000 });
  await expect(player2.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 10000 });

  await host.getByPlaceholder(/F.eks/).fill('En flyvende kat');
  await host.getByRole('button', { name: 'Indsend' }).click();
  await player2.getByPlaceholder(/F.eks/).fill('Et stort træ');
  await player2.getByRole('button', { name: 'Indsend' }).click();

  // Round 1: DRAW own word
  await expect(host.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
  await expect(player2.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });

  await host.getByRole('button', { name: 'Indsend' }).click();
  await player2.getByRole('button', { name: 'Indsend' }).click();

  // Round 2: GUESS other's drawing (N+1 = 3 rounds for 2 players)
  await expect(host.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });
  await expect(player2.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });

  await host.getByPlaceholder('Skriv dit gæt...').fill('et gæt');
  await host.getByRole('button', { name: 'Indsend' }).click();
  await player2.getByPlaceholder('Skriv dit gæt...').fill('et gæt');
  await player2.getByRole('button', { name: 'Indsend' }).click();

  // After 3 rounds, goes to REVEAL
  await expect(host).toHaveURL('/reveal', { timeout: 15000 });
  await expect(player2).toHaveURL('/reveal', { timeout: 15000 });
}

// ============================================================
// Feature 1: Toast Notifications
// ============================================================
test.describe('Toast Notifications', () => {
  test('shows error toast when joining with invalid code', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Dit navn').fill('TestSpiller');
    await page.getByPlaceholder('Indtast rumkode').fill('ZZZZZZ');
    await page.getByRole('button', { name: 'Deltag i spil' }).click();

    // Toast should appear with error message
    const toast = page.locator('.fixed.top-4.right-4');
    await expect(toast.getByText(/ikke fundet/)).toBeVisible({ timeout: 5000 });
  });

  test('toast auto-dismisses after a few seconds', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Dit navn').fill('TestSpiller');
    await page.getByPlaceholder('Indtast rumkode').fill('ZZZZZZ');
    await page.getByRole('button', { name: 'Deltag i spil' }).click();

    const toast = page.locator('.fixed.top-4.right-4');
    await expect(toast.getByText(/ikke fundet/)).toBeVisible({ timeout: 5000 });

    // Wait for auto-dismiss (3.5s)
    await expect(toast.getByText(/ikke fundet/)).not.toBeVisible({ timeout: 6000 });
  });

  test('toast can be manually dismissed', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Dit navn').fill('TestSpiller');
    await page.getByPlaceholder('Indtast rumkode').fill('ZZZZZZ');
    await page.getByRole('button', { name: 'Deltag i spil' }).click();

    const toastContainer = page.locator('.fixed.top-4.right-4');
    await expect(toastContainer.getByText(/ikke fundet/)).toBeVisible({ timeout: 5000 });

    // Click the dismiss button (×)
    await toastContainer.getByRole('button', { name: '×' }).click();
    await expect(toastContainer.getByText(/ikke fundet/)).not.toBeVisible({ timeout: 1000 });
  });
});

// ============================================================
// Feature 2: Undo/Redo on Drawing Canvas
// ============================================================
test.describe('Undo/Redo', () => {
  async function getToDrawScreen(browser: Browser) {
    const { host, player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    await startGameWithTimer(host, 'Normal');

    await expect(host).toHaveURL('/play', { timeout: 5000 });
    await expect(player2).toHaveURL('/play', { timeout: 5000 });

    // Submit words
    await expect(host.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });
    await host.getByPlaceholder(/F.eks/).fill('Test ord');
    await host.getByRole('button', { name: 'Indsend' }).click();
    await player2.getByPlaceholder(/F.eks/).fill('Andet ord');
    await player2.getByRole('button', { name: 'Indsend' }).click();

    // Wait for draw round
    await expect(host.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });

    return { host, player2, ctx1, ctx2 };
  }

  test('undo and redo buttons are visible on draw screen', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await getToDrawScreen(browser);

    await expect(host.getByRole('button', { name: 'Fortryd' })).toBeVisible();
    await expect(host.getByRole('button', { name: 'Gendan' })).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });

  test('undo button is disabled initially (only blank canvas)', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await getToDrawScreen(browser);

    const undoBtn = host.getByRole('button', { name: 'Fortryd' });
    await expect(undoBtn).toBeDisabled();

    await ctx1.close();
    await ctx2.close();
  });

  test('redo button is disabled initially', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await getToDrawScreen(browser);

    const redoBtn = host.getByRole('button', { name: 'Gendan' });
    await expect(redoBtn).toBeDisabled();

    await ctx1.close();
    await ctx2.close();
  });

  test('drawing enables undo button', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await getToDrawScreen(browser);

    const canvas = host.locator('canvas').first();
    const box = await canvas.boundingBox();

    // Draw a stroke
    await canvas.dispatchEvent('mousedown', { clientX: box!.x + 50, clientY: box!.y + 50 });
    await canvas.dispatchEvent('mousemove', { clientX: box!.x + 150, clientY: box!.y + 150 });
    await canvas.dispatchEvent('mouseup', {});

    // Undo should now be enabled
    const undoBtn = host.getByRole('button', { name: 'Fortryd' });
    await expect(undoBtn).toBeEnabled();

    await ctx1.close();
    await ctx2.close();
  });

  test('undo then redo cycle works', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await getToDrawScreen(browser);

    const canvas = host.locator('canvas').first();
    const box = await canvas.boundingBox();

    // Draw a stroke
    await canvas.dispatchEvent('mousedown', { clientX: box!.x + 50, clientY: box!.y + 50 });
    await canvas.dispatchEvent('mousemove', { clientX: box!.x + 150, clientY: box!.y + 150 });
    await canvas.dispatchEvent('mouseup', {});

    const undoBtn = host.getByRole('button', { name: 'Fortryd' });
    const redoBtn = host.getByRole('button', { name: 'Gendan' });

    // Undo
    await undoBtn.click();
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeEnabled();

    // Redo
    await redoBtn.click();
    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();

    await ctx1.close();
    await ctx2.close();
  });

  test('clear canvas then undo restores drawing', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await getToDrawScreen(browser);

    const canvas = host.locator('canvas').first();
    const box = await canvas.boundingBox();

    // Draw a stroke
    await canvas.dispatchEvent('mousedown', { clientX: box!.x + 50, clientY: box!.y + 50 });
    await canvas.dispatchEvent('mousemove', { clientX: box!.x + 150, clientY: box!.y + 150 });
    await canvas.dispatchEvent('mouseup', {});

    // Clear
    await host.getByRole('button', { name: 'Ryd', exact: true }).click();

    // Undo should still be available (clear is undoable)
    const undoBtn = host.getByRole('button', { name: 'Fortryd' });
    await expect(undoBtn).toBeEnabled();

    // Undo the clear
    await undoBtn.click();
    await expect(undoBtn).toBeEnabled(); // Still has the stroke to undo

    await ctx1.close();
    await ctx2.close();
  });
});

// ============================================================
// Feature 3: Configurable Timer
// ============================================================
test.describe('Configurable Timer', () => {
  test('timer presets are visible in lobby for host', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    // Timer toggle button is visible with default preset label
    const timerToggle = host.getByRole('button', { name: /Tidsbegrænsning/ });
    await expect(timerToggle).toBeVisible();
    await expect(timerToggle).toContainText('Normal');

    // Expand to see presets
    await timerToggle.click();
    await expect(host.getByRole('button', { name: /Kort/ })).toBeVisible();
    await expect(host.getByRole('button', { name: /Normal/ })).toBeVisible();
    await expect(host.getByRole('button', { name: /Lang/ })).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });

  test('timer presets are NOT visible for non-host', async ({ browser }) => {
    const { player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    // Non-host should see waiting text, NOT the timer config
    await expect(player2.getByRole('button', { name: /Tidsbegrænsning/ })).not.toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });

  test('short timer shows 45s for draw round', async ({ browser }) => {
    const { host, player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    await startGameWithTimer(host, 'Kort');

    // Submit words to get to draw round
    await expect(host.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });
    await host.getByPlaceholder(/F.eks/).fill('Kort test');
    await host.getByRole('button', { name: 'Indsend' }).click();
    await player2.getByPlaceholder(/F.eks/).fill('Kort test 2');
    await player2.getByRole('button', { name: 'Indsend' }).click();

    // Draw round should show 45s timer
    await expect(host.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
    await expect(host.getByText(/45s/)).toBeVisible({ timeout: 3000 });

    await ctx1.close();
    await ctx2.close();
  });

  test('long timer shows 120s for draw round', async ({ browser }) => {
    const { host, player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    await startGameWithTimer(host, 'Lang');

    // Submit words
    await expect(host.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });
    await host.getByPlaceholder(/F.eks/).fill('Lang test');
    await host.getByRole('button', { name: 'Indsend' }).click();
    await player2.getByPlaceholder(/F.eks/).fill('Lang test 2');
    await player2.getByRole('button', { name: 'Indsend' }).click();

    // Draw round should show 120s timer
    await expect(host.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
    await expect(host.getByText(/120s/)).toBeVisible({ timeout: 3000 });

    await ctx1.close();
    await ctx2.close();
  });
});

// ============================================================
// Feature 4: Play Again
// ============================================================
test.describe('Play Again', () => {
  test('host sees "Spil igen" button after reveal', async ({ browser }) => {
    const { host, player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    await startGameWithTimer(host, 'Normal');
    await playFullGame(host, player2);

    // Navigate through all reveal entries
    while (await host.getByRole('button', { name: 'Se resultat' }).isVisible().catch(() => false) === false) {
      await host.getByRole('button', { name: /Næste/ }).click();
    }
    await host.getByRole('button', { name: 'Se resultat' }).click();

    // Host should see "Spil igen" button
    await expect(host.getByRole('button', { name: 'Spil igen' })).toBeVisible({ timeout: 5000 });

    await ctx1.close();
    await ctx2.close();
  });

  test('non-host sees waiting message after reveal', async ({ browser }) => {
    const { host, player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    await startGameWithTimer(host, 'Normal');
    await playFullGame(host, player2);

    // Navigate player2 through all reveal entries
    while (await player2.getByRole('button', { name: 'Se resultat' }).isVisible().catch(() => false) === false) {
      await player2.getByRole('button', { name: /Næste/ }).click();
    }
    await player2.getByRole('button', { name: 'Se resultat' }).click();

    // Non-host should see waiting text
    await expect(player2.getByText(/Venter på at værten/)).toBeVisible({ timeout: 5000 });

    await ctx1.close();
    await ctx2.close();
  });

  test('host clicking "Spil igen" creates new lobby and redirects both players', async ({ browser }) => {
    const { host, player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    await startGameWithTimer(host, 'Normal');
    await playFullGame(host, player2);

    // Both players navigate through all reveal entries until "Se resultat" appears
    for (const page of [host, player2]) {
      // Click through all entries until we see "Se resultat"
      for (let i = 0; i < 20; i++) {
        const seResultat = page.getByRole('button', { name: 'Se resultat' });
        if (await seResultat.isVisible().catch(() => false)) {
          await seResultat.click();
          break;
        }
        // Click any "Næste" or "Næste kæde" button
        const nextBtn = page.getByRole('button', { name: /Næste/ });
        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click();
          await page.waitForTimeout(200);
        }
      }
    }

    // Host should see "Spil igen"
    await expect(host.getByRole('button', { name: 'Spil igen' })).toBeVisible({ timeout: 5000 });

    // Player2 should see waiting message (polling is active)
    await expect(player2.getByText(/Venter på at værten/)).toBeVisible({ timeout: 5000 });

    // Monitor network to confirm API call
    const apiCalls: string[] = [];
    host.on('request', (req) => { if (req.url().includes('play-again')) apiCalls.push(req.url()); });
    const responsePromise = host.waitForResponse((r) => r.url().includes('play-again'), { timeout: 15000 });

    // Host clicks play again
    await host.getByRole('button', { name: 'Spil igen' }).click();

    // Wait for the play-again API response
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    // Host should be in new lobby
    await expect(host).toHaveURL('/lobby', { timeout: 15000 });
    await expect(host.getByTestId('room-code')).toBeVisible({ timeout: 10000 });

    // Player2 should auto-join via polling and also navigate to lobby
    await expect(player2).toHaveURL('/lobby', { timeout: 20000 });

    await ctx1.close();
    await ctx2.close();
  });
});

// ============================================================
// Feature 5: Share Chain as Image
// ============================================================
test.describe('Share Chain as Image', () => {
  test('"Del kæde" button appears when chain is fully revealed', async ({ browser }) => {
    const { host, player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    await startGameWithTimer(host, 'Normal');
    await playFullGame(host, player2);

    // "Del kæde" should NOT be visible while entries are still being revealed
    await expect(host.getByRole('button', { name: 'Del kæde' })).not.toBeVisible();

    // Click through entries until all are visible (chain 1)
    // With 2 players, each chain has 3 entries (WORD + DRAW + GUESS)
    await host.getByRole('button', { name: 'Næste' }).click(); // Show 2nd entry
    await host.getByRole('button', { name: 'Næste' }).click(); // Show 3rd entry

    // Now all entries are shown, "Del kæde" should be visible
    await expect(host.getByRole('button', { name: 'Del kæde' })).toBeVisible({ timeout: 3000 });

    await ctx1.close();
    await ctx2.close();
  });

  test('"Del kæde" triggers download', async ({ browser }) => {
    const { host, player2, ctx1, ctx2 } = await setupTwoPlayerGame(browser);

    await startGameWithTimer(host, 'Normal');
    await playFullGame(host, player2);

    // Reveal all entries of chain 1 (3 entries: WORD + DRAW + GUESS)
    await host.getByRole('button', { name: 'Næste' }).click();
    await host.getByRole('button', { name: 'Næste' }).click();

    await expect(host.getByRole('button', { name: 'Del kæde' })).toBeVisible({ timeout: 3000 });

    // Set up download listener
    const downloadPromise = host.waitForEvent('download', { timeout: 10000 });
    await host.getByRole('button', { name: 'Del kæde' }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/kaede-.*\.png/);

    await ctx1.close();
    await ctx2.close();
  });
});
