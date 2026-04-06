import { test, expect } from '@playwright/test';

test.describe('Color Picker', () => {
  async function navigateToDrawScreen(browser: import('@playwright/test').Browser) {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const host = await ctx1.newPage();
    const player2 = await ctx2.newPage();

    // Create room
    await host.goto('/');
    await host.getByPlaceholder('Dit navn').fill('Tegner1');
    await host.getByRole('button', { name: 'Opret spil' }).click();
    await expect(host).toHaveURL('/lobby');
    const code = await host.getByTestId('room-code').textContent();

    // Join room
    await player2.goto('/');
    await player2.getByPlaceholder('Dit navn').fill('Tegner2');
    await player2.getByPlaceholder('Indtast rumkode').fill(code!);
    await player2.getByRole('button', { name: 'Deltag i spil' }).click();
    await expect(player2).toHaveURL('/lobby');

    // Wait for both to see each other, then start
    await expect(host.getByText('Tegner2')).toBeVisible({ timeout: 5000 });
    await host.getByRole('button', { name: 'Start spillet' }).click();

    // Both submit initial words
    await expect(host).toHaveURL('/play', { timeout: 5000 });
    await expect(player2).toHaveURL('/play', { timeout: 5000 });
    await expect(host.getByText('Skriv et ord eller en sætning')).toBeVisible({ timeout: 5000 });
    await host.getByPlaceholder(/F.eks/).fill('En rød bil');
    await host.getByRole('button', { name: 'Indsend' }).click();
    await player2.getByPlaceholder(/F.eks/).fill('En blå hund');
    await player2.getByRole('button', { name: 'Indsend' }).click();

    // Now both should be on drawing screen
    await expect(host.getByText(/Tegn:/)).toBeVisible({ timeout: 10000 });

    return { host, player2, ctx1, ctx2 };
  }

  test('rainbow button opens color picker dropdown', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await navigateToDrawScreen(browser);

    // Find the rainbow button by its title
    const rainbowBtn = host.getByTitle('Vælg farve');
    await expect(rainbowBtn).toBeVisible();

    // Dropdown should not be visible initially
    await expect(host.getByTestId('color-picker-dropdown')).not.toBeVisible();

    // Click rainbow button
    await rainbowBtn.click();

    // Dropdown should now be visible
    await expect(host.getByTestId('color-picker-dropdown')).toBeVisible();

    // Should contain the color picker canvas
    await expect(host.getByTestId('color-picker-canvas')).toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });

  test('color picker canvas is not black - contains multiple colors', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await navigateToDrawScreen(browser);

    // Open color picker
    await host.getByTitle('Vælg farve').click();
    await expect(host.getByTestId('color-picker-dropdown')).toBeVisible();

    // Take screenshot of the color picker canvas and verify it's not all black
    const canvas = host.getByTestId('color-picker-canvas');
    await expect(canvas).toBeVisible();

    // Sample colors from the canvas by clicking different positions
    // The canvas is 160x160 with hue on X axis and lightness on Y axis
    // Top-left should be reddish/light, top-right should be reddish/light (wraps)
    // We verify by checking that clicking different spots changes the displayed color hex

    const hexDisplay = host.locator('[data-testid="color-picker-dropdown"] .font-mono');

    // Click near top-left (red-ish, light)
    await canvas.click({ position: { x: 5, y: 5 } });
    const color1 = await hexDisplay.textContent();

    // Click near center-top (cyan/green-ish, light)
    await canvas.click({ position: { x: 80, y: 5 } });
    const color2 = await hexDisplay.textContent();

    // Click near right side middle (magenta, medium)
    await canvas.click({ position: { x: 150, y: 80 } });
    const color3 = await hexDisplay.textContent();

    // All three should be different colors (proving the canvas isn't all one color)
    expect(color1).not.toBe(color2);
    expect(color2).not.toBe(color3);
    expect(color1).not.toBe(color3);

    // None should be pure black (which would indicate the canvas didn't render)
    expect(color1).not.toBe('#000000');
    expect(color2).not.toBe('#000000');

    await ctx1.close();
    await ctx2.close();
  });

  test('clicking color picker canvas changes drawing color', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await navigateToDrawScreen(browser);

    // Open color picker
    await host.getByTitle('Vælg farve').click();
    await expect(host.getByTestId('color-picker-dropdown')).toBeVisible();

    const canvas = host.getByTestId('color-picker-canvas');

    // Click on a colored area (middle, should be some saturated color)
    await canvas.click({ position: { x: 40, y: 40 } });

    // The color preview swatch should be visible
    const swatch = host.locator('[data-testid="color-picker-dropdown"] .rounded-full');
    await expect(swatch).toBeVisible();

    // Verify hex code is displayed and is a valid hex color
    const hexDisplay = host.locator('[data-testid="color-picker-dropdown"] .font-mono');
    const hex = await hexDisplay.textContent();
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);

    await ctx1.close();
    await ctx2.close();
  });

  test('closing color picker by clicking outside', async ({ browser }) => {
    const { host, ctx1, ctx2 } = await navigateToDrawScreen(browser);

    // Open color picker
    await host.getByTitle('Vælg farve').click();
    await expect(host.getByTestId('color-picker-dropdown')).toBeVisible();

    // Click outside the picker (on the heading text)
    await host.getByText(/Tegn:/).click({ force: true });

    // Dropdown should close
    await expect(host.getByTestId('color-picker-dropdown')).not.toBeVisible();

    await ctx1.close();
    await ctx2.close();
  });
});
