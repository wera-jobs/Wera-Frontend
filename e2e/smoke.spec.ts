import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { deleteAccount, signUpAndOnboard } from "./helpers";

// Every page loads without errors, fits the screen and passes axe (WCAG 2 A and AA), on desktop and on a phone.
test("every page renders", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signUpAndOnboard(page);
  // A saved job, so the tracker has a card to check.
  await page.goto("/jobs?q=E2E%20Robotics");
  await page
    .getByText("Site Reliability Engineer", { exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.keyboard.press("Escape");
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    }
    for (const [path, heading] of [
      ["/", "Today"],
      ["/jobs", "Jobs"],
      ["/industries", "Industries"],
      ["/tracker", "Tracker"],
      ["/sponsorship", "Sponsorship"],
      ["/interview", "Interview prep"],
      ["/community", "Community"],
      ["/profile", "Erin Example"],
      ["/profile/resume", "Erin Example"],
      ["/settings", "Settings"],
    ] as const) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: heading, level: 1 }),
      ).toBeVisible();
      // Nothing pushes the page wider than the screen (a phone must never scroll sideways).
      const wide = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(
        wide,
        `${path} is ${wide}px wider than the screen`,
      ).toBeLessThanOrEqual(1);
      // Wait out entrance animations so contrast is read at rest.
      await page.waitForTimeout(600);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        axe.violations.map(
          (v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`,
        ),
        `axe on ${path} (${theme})`,
      ).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
  await deleteAccount(page);
});

test("the theme toggle switches and remembers", async ({ page }) => {
  await page.goto("/login");
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  await page
    .getByRole("button", { name: /Switch to (light|dark) mode/ })
    .click();
  await expect(html).not.toHaveAttribute("data-theme", before ?? "");
  await page.reload();
  await expect(html).not.toHaveAttribute("data-theme", before ?? "");
});
