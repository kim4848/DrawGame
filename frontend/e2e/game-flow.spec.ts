import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe('Hearsay Game Flow', () => {
  test('create room and see room code', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Hvad sker der egentlig?')).toBeVisible();

    await page.getByPlaceholder('Dit navn').fill('TestVært');
    await page.getByRole('button', { name: 'Opret spil' }).click();

    await expect(page).toHaveURL('/lobby');
    await expect(page.getByTestId('room-code')).toBeVisible();
    await expect(page.getByText('TestVært')).toBeVisible();
  });

  test('join room with invalid code shows error', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Dit navn').fill('TestSpiller');
    await page.getByPlaceholder('Indtast rumkode').fill('ZZZZZZ');
    await page.getByRole('button', { name: 'Deltag i spil' }).click();

    await expect(page.getByText(/ikke fundet/)).toBeVisible();
  });

  test('two players can join and see each other in lobby', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const host = await ctx1.newPage();
    const joiner = await ctx2.newPage();

    // Host creates room
    await host.goto('/');
    await host.getByPlaceholder('Dit navn').fill('Vært');
    await host.getByRole('button', { name: 'Opret spil' }).click();
    await expect(host).toHaveURL('/lobby');

    const code = await host.getByTestId('room-code').textContent();
    expect(code).toBeTruthy();

    // Joiner joins
    await joiner.goto('/');
    await joiner.getByPlaceholder('Dit navn').fill('Spiller2');
    await joiner.getByPlaceholder('Indtast rumkode').fill(code!);
    await joiner.getByRole('button', { name: 'Deltag i spil' }).click();
    await expect(joiner).toHaveURL('/lobby');

    // Both should see both players (after poll)
    await expect(host.getByText('Spiller2')).toBeVisible({ timeout: 5000 });
    await expect(joiner.getByText('Vært', { exact: true })).toBeVisible({ timeout: 5000 });

    await ctx1.close();
    await ctx2.close();
  });

  test('full game flow with two players', async ({ browser }) => {
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

    // Wait for player list update
    await expect(host.getByText('Bob')).toBeVisible({ timeout: 5000 });

    // Host starts game
    await host.getByRole('button', { name: 'Start spillet' }).click();

    // Both should navigate to /play
    await expect(host).toHaveURL('/play', { timeout: 5000 });
    await expect(player2).toHaveURL('/play', { timeout: 5000 });

    // Round 0: Both players submit a word
    await expect(host.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });
    await expect(player2.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });

    await host.getByPlaceholder(/F.eks/).fill('En flyvende kat');
    await host.getByRole('button', { name: 'Indsend' }).click();

    await player2.getByPlaceholder(/F.eks/).fill('Et stort træ');
    await player2.getByRole('button', { name: 'Indsend' }).click();

    // Round 1: Both draw their OWN word (self-draw round)
    await expect(host.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });
    await expect(player2.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });

    // Submit drawings (empty canvas is fine for test)
    await host.getByRole('button', { name: 'Indsend' }).click();
    await player2.getByRole('button', { name: 'Indsend' }).click();

    // Round 2: Both guess the other's drawing (N+1 = 3 rounds for 2 players)
    await expect(host.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });
    await expect(player2.getByText('Hvad forestiller denne tegning?')).toBeVisible({ timeout: 10000 });

    await host.getByPlaceholder('Skriv dit gæt...').fill('et gæt');
    await host.getByRole('button', { name: 'Indsend' }).click();
    await player2.getByPlaceholder('Skriv dit gæt...').fill('et gæt');
    await player2.getByRole('button', { name: 'Indsend' }).click();

    // After round 2 (3 rounds total for 2 players), goes to REVEAL
    await expect(host).toHaveURL('/reveal', { timeout: 15000 });
    await expect(player2).toHaveURL('/reveal', { timeout: 15000 });

    // Reveal page should show chain data
    await expect(host.getByText('Hvad skete der?')).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });
});
