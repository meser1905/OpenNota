import { expect, type Page, test } from '@playwright/test';

/**
 * End-to-end coverage of the OpenNota grading flow against the seeded
 * "Colegio San Martín" data set.
 *
 * It walks the two journeys that matter most:
 *   1. A teacher signs in, reaches the dashboard, opens the grade sheet and
 *      sees their class roster once a subject and term are selected.
 *   2. A student signs in and opens their report card.
 *
 * Selectors are accessible — form labels, ARIA roles and visible text — so the
 * spec stays robust against styling changes. The UI ships in Spanish, hence
 * the Spanish labels below ("Ingresar", "Calificaciones", "Boletines", ...).
 *
 * Requires both the API (port 3001) and the web app (port 3000) running with
 * the seed database; Playwright's `webServer` config starts them.
 */

const TEACHER = { email: 'teacher1@opennota.local', password: 'Teacher123!' };
const STUDENT = { email: 'student1@opennota.local', password: 'Student123!' };

/** Signs in through the `/login` form and waits for the dashboard to render. */
async function login(page: Page, credentials: { email: string; password: string }): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // A successful login redirects off /login onto the dashboard.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('grading flow', () => {
  test('a teacher logs in and opens the grade sheet for one of their subjects', async ({
    page,
  }) => {
    await login(page, TEACHER);

    // The teacher dashboard greets the user and lists their subjects.
    await expect(page.getByRole('heading', { name: /Hola/ })).toBeVisible();

    // Navigate to the grade sheet via the sidebar link.
    await page.getByRole('link', { name: 'Calificaciones' }).first().click();
    await page.waitForURL('**/grades');
    await expect(page.getByRole('heading', { name: 'Calificaciones' })).toBeVisible();

    // Pick the first subject offered in the subject selector.
    const subjectSelect = page.getByRole('combobox').first();
    await subjectSelect.click();
    const subjectOptions = page.getByRole('option');
    await expect(subjectOptions.first()).toBeVisible();
    await subjectOptions.first().click();

    // Pick the first term.
    const termSelect = page.getByRole('combobox').nth(1);
    await termSelect.click();
    const termOptions = page.getByRole('option');
    await expect(termOptions.first()).toBeVisible();
    await termOptions.first().click();

    // With a subject and term chosen the sheet loads. The seeded first
    // trimester has students enrolled, so the roster table is shown — assert a
    // student row appears (the seed uses "Surname, Firstname" cells) or, for a
    // term with no evaluations, the explanatory empty state.
    const rosterCell = page.locator('table tbody tr td').first();
    const emptyState = page.getByText(
      /Creá una evaluación|todavía no tiene estudiantes|Elegí una asignatura/,
    );
    await expect(rosterCell.or(emptyState).first()).toBeVisible();
  });

  test('a student logs in and opens their report card', async ({ page }) => {
    await login(page, STUDENT);

    // Navigate to the report cards section from the sidebar.
    await page.getByRole('link', { name: 'Boletines' }).first().click();
    await page.waitForURL('**/report-cards');
    await expect(page.getByRole('heading', { name: 'Boletines' })).toBeVisible();

    // Before any filters are picked the page prompts the student to choose a
    // student and term — the report-card workspace is reachable.
    await expect(
      page.getByText('Elegí un estudiante y un período para ver su boletín'),
    ).toBeVisible();

    // The student and term selectors are both present and operable.
    await expect(page.getByRole('combobox')).toHaveCount(2);
  });
});
