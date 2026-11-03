## How we protect your account

- Passwords are stored only as bcrypt hashes. Nobody at Wera can see yours.
- Signing in gives your browser a random token in a cookie that scripts cannot read, and we store only a hash of it. Changing your password signs out every other browser and disconnects the extension.
- Sign-in, sign-up and the AI features are rate limited, to stop password guessing and abuse.
- Every connection to Wera is encrypted, and the site sends strict security headers, including a content security policy.
- Self-identification answers are never sent to an AI model.
- What admins do to accounts and posts is logged.

## How we handle your data

Your data is stored on servers we run in the United States, and only the people who operate Wera can reach them. We share it only with the providers that run the service, as the [privacy policy](/privacy) describes.

## Report a vulnerability

Email [jessechumo@gmail.com](mailto:jessechumo@gmail.com) with what you found, the steps to reproduce it and the impact you expect. Please do not open a public issue.

- We reply within 3 business days.
- We confirm or rule out the issue and tell you what we plan to do.
- We fix serious issues first.
- We credit you when the fix ships, if you would like that.

## Good-faith research

We will not pursue action against research that:

- stays within your own account and test data
- avoids reading, changing or deleting other people's data
- avoids disrupting the service, including denial of service and heavy automated scanning
- gives us reasonable time to fix the issue before it is made public

If you reach someone else's data by accident, stop, do not keep a copy, and tell us.

Out of scope: social engineering of our team or users, physical attacks, reports from automated scanners with no demonstrated impact, and missing best-practice headers with no security effect.
