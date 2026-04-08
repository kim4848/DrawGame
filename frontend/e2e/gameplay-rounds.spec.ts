import { test, expect, type Page, type Browser, type BrowserContext } from '@playwright/test';

/**
 * Sets up a game with the given number of players, starts it, and returns all pages.
 */
async function setupGame(browser: Browser, playerCount: number) {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];

  for (let i = 0; i < playerCount; i++) {
    const ctx = await browser.newContext();
    contexts.push(ctx);
    pages.push(await ctx.newPage());
  }

  const host = pages[0];

  // Host creates room
  await host.goto('/');
  await host.getByPlaceholder('Dit navn').fill('Spiller1');
  await host.getByRole('button', { name: 'Opret spil' }).click();
  await expect(host).toHaveURL('/lobby');
  const code = await host.getByTestId('room-code').textContent();

  // Others join
  for (let i = 1; i < playerCount; i++) {
    await pages[i].goto('/');
    await pages[i].getByPlaceholder('Dit navn').fill(`Spiller${i + 1}`);
    await pages[i].getByPlaceholder('Indtast rumkode').fill(code!);
    await pages[i].getByRole('button', { name: 'Deltag i spil' }).click();
    await expect(pages[i]).toHaveURL('/lobby');
  }

  // Wait for all players visible to host
  for (let i = 1; i < playerCount; i++) {
    await expect(host.getByText(`Spiller${i + 1}`)).toBeVisible({ timeout: 5000 });
  }

  // Host starts game with short timer to speed up test
  await host.getByRole('button', { name: /Kort/ }).click();
  await host.getByRole('button', { name: 'Start spillet' }).click();

  // All navigate to /play
  for (const page of pages) {
    await expect(page).toHaveURL('/play', { timeout: 5000 });
  }

  return { pages, contexts, code: code! };
}

async function closeAll(contexts: BrowserContext[]) {
  for (const ctx of contexts) await ctx.close();
}

// ============================================================
// Round assignment & chain rotation with 2 players
// ============================================================
test.describe('Gameplay rounds - 2 players', () => {
  test('R0 WORD, R1 DRAW own word, R2 GUESS, then REVEAL', async ({ browser }) => {
    const { pages, contexts } = await setupGame(browser, 2);
    const [p1, p2] = pages;

    // -- Round 0: WORD --
    // Both see word prompt and correct round counter (Runde 1 af 3)
    for (const p of pages) {
      await expect(p.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });
      await expect(p.getByText('Runde 1 af 3')).toBeVisible();
    }

    // Submit words
    await p1.getByPlaceholder(/F.eks/).fill('juletræ');
    await p1.getByRole('button', { name: 'Indsend' }).click();
    await p2.getByPlaceholder(/F.eks/).fill('cykel');
    await p2.getByRole('button', { name: 'Indsend' }).click();

    // -- Round 1: DRAW own word --
    // Each player should see their OWN word as the prompt
    await expect(p1.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
    await expect(p2.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });

    // Verify player sees their own word
    await expect(p1.getByText('juletræ')).toBeVisible();
    await expect(p2.getByText('cykel')).toBeVisible();

    // Verify round counter
    await expect(p1.getByText('Runde 2 af 3')).toBeVisible();

    // Submit drawings (empty canvas)
    await p1.getByRole('button', { name: 'Indsend' }).click();
    await p2.getByRole('button', { name: 'Indsend' }).click();

    // -- Round 2: GUESS other's drawing --
    await expect(p1.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });
    await expect(p2.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });
    await expect(p1.getByText('Runde 3 af 3')).toBeVisible();

    // Submit guesses
    await p1.getByPlaceholder('Skriv dit gæt...').fill('en cykel');
    await p1.getByRole('button', { name: 'Indsend' }).click();
    await p2.getByPlaceholder('Skriv dit gæt...').fill('et juletræ');
    await p2.getByRole('button', { name: 'Indsend' }).click();

    // -- REVEAL --
    await expect(p1).toHaveURL('/reveal', { timeout: 15000 });
    await expect(p2).toHaveURL('/reveal', { timeout: 15000 });
    await expect(p1.getByText('Hvad skete der?')).toBeVisible();

    // Should show 2 chains (one per player)
    await expect(p1.getByText('Kæde 1 af 2')).toBeVisible();

    await closeAll(contexts);
  });

  test('total rounds counter shows N+1', async ({ browser }) => {
    const { pages, contexts } = await setupGame(browser, 2);

    // With 2 players, totalRounds = 3 (N+1)
    await expect(pages[0].getByText('Runde 1 af 3')).toBeVisible({ timeout: 5000 });

    await closeAll(contexts);
  });
});

// ============================================================
// Round assignment & chain rotation with 3 players
// ============================================================
test.describe('Gameplay rounds - 3 players', () => {
  test('full game with 3 players: WORD, DRAW own, GUESS, DRAW → REVEAL', async ({ browser }) => {
    const { pages, contexts } = await setupGame(browser, 3);
    const [p1] = pages;
    const words = ['sol', 'hund', 'båd'];

    // -- Round 0: WORD (Runde 1 af 4) --
    for (let i = 0; i < 3; i++) {
      await expect(pages[i].getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });
      await expect(pages[i].getByText('Runde 1 af 4')).toBeVisible();
      await pages[i].getByPlaceholder(/F.eks/).fill(words[i]);
      await pages[i].getByRole('button', { name: 'Indsend' }).click();
    }

    // -- Round 1: DRAW own word --
    for (let i = 0; i < 3; i++) {
      await expect(pages[i].getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
      // Each player sees their own word
      await expect(pages[i].getByText(words[i])).toBeVisible();
    }
    await expect(p1.getByText('Runde 2 af 4')).toBeVisible();

    // Submit drawings
    for (const p of pages) {
      await p.getByRole('button', { name: 'Indsend' }).click();
    }

    // -- Round 2: GUESS (another player's drawing) --
    for (const p of pages) {
      await expect(p.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });
    }
    await expect(p1.getByText('Runde 3 af 4')).toBeVisible();

    for (const p of pages) {
      await p.getByPlaceholder('Skriv dit gæt...').fill('noget sjovt');
      await p.getByRole('button', { name: 'Indsend' }).click();
    }

    // -- Round 3: DRAW (based on someone's guess) --
    for (const p of pages) {
      await expect(p.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
    }
    await expect(p1.getByText('Runde 4 af 4')).toBeVisible();

    for (const p of pages) {
      await p.getByRole('button', { name: 'Indsend' }).click();
    }

    // -- REVEAL --
    for (const p of pages) {
      await expect(p).toHaveURL('/reveal', { timeout: 15000 });
    }
    await expect(p1.getByText('Kæde 1 af 3')).toBeVisible();

    await closeAll(contexts);
  });
});

// ============================================================
// Full 5-player game: all rounds + all chains visible for all
// ============================================================
test.describe('Gameplay rounds - 5 players', () => {
  test('full game plays N+1 rounds and all 5 chains are revealed to every player', async ({ browser }) => {
    const N = 5;
    const totalRounds = N + 1; // 6
    const { pages, contexts } = await setupGame(browser, N);
    const words = ['elefant', 'guitar', 'regnbue', 'vulkan', 'pingvin'];

    // -- Round 0: WORD --
    for (let i = 0; i < N; i++) {
      await expect(pages[i].getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });
      await expect(pages[i].getByText(`Runde 1 af ${totalRounds}`)).toBeVisible();
      await pages[i].getByPlaceholder(/F.eks/).fill(words[i]);
      await pages[i].getByRole('button', { name: 'Indsend' }).click();
    }

    // -- Round 1: DRAW own word --
    for (let i = 0; i < N; i++) {
      await expect(pages[i].getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
      await expect(pages[i].getByText(words[i])).toBeVisible();
    }
    await expect(pages[0].getByText(`Runde 2 af ${totalRounds}`)).toBeVisible();
    for (const p of pages) {
      await p.getByRole('button', { name: 'Indsend' }).click();
    }

    // -- Round 2: GUESS --
    for (const p of pages) {
      await expect(p.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });
    }
    await expect(pages[0].getByText(`Runde 3 af ${totalRounds}`)).toBeVisible();
    for (const p of pages) {
      await p.getByPlaceholder('Skriv dit gæt...').fill('et dyr');
      await p.getByRole('button', { name: 'Indsend' }).click();
    }

    // -- Round 3: DRAW --
    for (const p of pages) {
      await expect(p.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
    }
    await expect(pages[0].getByText(`Runde 4 af ${totalRounds}`)).toBeVisible();
    for (const p of pages) {
      await p.getByRole('button', { name: 'Indsend' }).click();
    }

    // -- Round 4: GUESS --
    for (const p of pages) {
      await expect(p.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });
    }
    await expect(pages[0].getByText(`Runde 5 af ${totalRounds}`)).toBeVisible();
    for (const p of pages) {
      await p.getByPlaceholder('Skriv dit gæt...').fill('noget fedt');
      await p.getByRole('button', { name: 'Indsend' }).click();
    }

    // -- Round 5: DRAW --
    for (const p of pages) {
      await expect(p.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
    }
    await expect(pages[0].getByText(`Runde 6 af ${totalRounds}`)).toBeVisible();
    for (const p of pages) {
      await p.getByRole('button', { name: 'Indsend' }).click();
    }

    // -- REVEAL: verify all players reach reveal --
    for (const p of pages) {
      await expect(p).toHaveURL('/reveal', { timeout: 15000 });
      await expect(p.getByText('Hvad skete der?')).toBeVisible();
    }

    // -- Verify every player sees all 5 chains with 6 entries each --
    for (let pi = 0; pi < N; pi++) {
      const p = pages[pi];

      for (let ci = 0; ci < N; ci++) {
        // Verify chain header
        await expect(p.getByText(`Kæde ${ci + 1} af ${N}`)).toBeVisible({ timeout: 5000 });

        // Each chain has totalRounds entries (WORD + DRAW + GUESS + DRAW + GUESS + DRAW)
        // First entry is visible, click Næste for the remaining ones
        const entryCards = p.locator('.clay-card.animate-fade-slide-in');
        await expect(entryCards).toHaveCount(1);

        for (let ei = 1; ei < totalRounds; ei++) {
          await p.getByRole('button', { name: 'Næste' }).click();
          await expect(entryCards).toHaveCount(ei + 1, { timeout: 3000 });
        }

        // All entries shown — should see Næste kæde or Se resultat
        if (ci < N - 1) {
          await expect(p.getByRole('button', { name: 'Næste kæde' })).toBeVisible();
          await p.getByRole('button', { name: 'Næste kæde' }).click();
        } else {
          await expect(p.getByRole('button', { name: 'Se resultat' })).toBeVisible();
        }
      }
    }

    await closeAll(contexts);
  });
});

// ============================================================
// Reveal shows all chains with correct entries
// ============================================================
test.describe('Reveal chain completeness', () => {
  test('each chain has N+1 entries (WORD + N rounds)', async ({ browser }) => {
    const { pages, contexts } = await setupGame(browser, 2);
    const [p1, p2] = pages;

    // Play through all rounds
    // R0: WORD
    await p1.getByPlaceholder(/F.eks/).fill('astronaut');
    await p1.getByRole('button', { name: 'Indsend' }).click();
    await p2.getByPlaceholder(/F.eks/).fill('pizza');
    await p2.getByRole('button', { name: 'Indsend' }).click();

    // R1: DRAW own word
    await expect(p1.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
    await p1.getByRole('button', { name: 'Indsend' }).click();
    await p2.getByRole('button', { name: 'Indsend' }).click();

    // R2: GUESS
    await expect(p1.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });
    await p1.getByPlaceholder('Skriv dit gæt...').fill('rumrejse');
    await p1.getByRole('button', { name: 'Indsend' }).click();
    await p2.getByPlaceholder('Skriv dit gæt...').fill('italiensk mad');
    await p2.getByRole('button', { name: 'Indsend' }).click();

    // REVEAL
    await expect(p1).toHaveURL('/reveal', { timeout: 15000 });

    // Chain 1: should have 3 entries (WORD, DRAW, GUESS)
    // Click through all entries
    const entries: string[] = [];
    // First entry is visible immediately
    entries.push(await p1.locator('.clay-card.animate-fade-slide-in').first().textContent() || '');

    // Click Næste for second entry
    await p1.getByRole('button', { name: 'Næste' }).click();
    await p1.waitForTimeout(300);

    // Click Næste for third entry
    await p1.getByRole('button', { name: 'Næste' }).click();
    await p1.waitForTimeout(300);

    // After 3 entries we should see "Næste kæde" (all entries of chain 1 shown)
    await expect(p1.getByRole('button', { name: 'Næste kæde' })).toBeVisible();

    // 3 entry cards should be visible
    const entryCards = p1.locator('.clay-card.animate-fade-slide-in');
    await expect(entryCards).toHaveCount(3);

    // Navigate to chain 2
    await p1.getByRole('button', { name: 'Næste kæde' }).click();
    await expect(p1.getByText('Kæde 2 af 2')).toBeVisible();

    // Click through chain 2 entries
    await p1.getByRole('button', { name: 'Næste' }).click();
    await p1.waitForTimeout(300);
    await p1.getByRole('button', { name: 'Næste' }).click();
    await p1.waitForTimeout(300);

    // Should now show "Se resultat"
    await expect(p1.getByRole('button', { name: 'Se resultat' })).toBeVisible();

    await closeAll(contexts);
  });
});
