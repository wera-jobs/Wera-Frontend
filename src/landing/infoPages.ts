/**
 * The company, help and policy pages the footer links to. Each page's text
 * is in pages/<path>.md and loads only when someone opens it. Policies carry
 * the date they took effect; change it whenever their text changes.
 */
export const INFO_PAGES: Record<string, { title: string; blurb: string; effective?: string }> = {
  about: { title: 'About Wera', blurb: 'A job search service for students, new grads and international talent, built in Texas.' },
  careers: { title: 'Careers', blurb: 'Wera is a small team. Here is how to get involved.' },
  press: { title: 'Press', blurb: 'Logos, a short description of Wera, and who to contact.' },
  contact: { title: 'Contact', blurb: 'One address for everything, read by the people who build Wera.' },
  help: { title: 'Help center', blurb: 'Answers about your profile, your matches, sponsorship data, resumes, the extension and your account.' },
  ai: { title: 'How Wera uses AI', blurb: 'Where AI does the work, what it sees, and what it never does.', effective: 'November 3, 2026' },
  accessibility: { title: 'Accessibility', blurb: 'Wera should work for everyone looking for a job.' },
  security: { title: 'Security', blurb: 'How we protect your account and data, and how to report a problem.' },
  privacy: { title: 'Privacy policy', blurb: 'What Wera collects, why, who receives it, and the choices you have.', effective: 'November 3, 2026' },
  terms: { title: 'Terms of service', blurb: 'The agreement between you and Wera when you use the site and the extension.', effective: 'November 3, 2026' },
  cookies: { title: 'Cookie policy', blurb: 'The one cookie Wera uses, and what it keeps in your browser.', effective: 'November 3, 2026' },
  'acceptable-use': { title: 'Acceptable use policy', blurb: 'What you may not do with Wera.', effective: 'November 3, 2026' },
  'community-guidelines': { title: 'Community guidelines', blurb: 'What belongs in the community, and how moderation works.' },
  'extension-data': { title: 'Chrome extension data', blurb: 'What the extension does on each kind of page, and what leaves your browser.', effective: 'November 3, 2026' },
};
