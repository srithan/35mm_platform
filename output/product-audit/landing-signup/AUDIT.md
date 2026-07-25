# 35mm signed-out landing audit

## Scope

- Surface: desktop signed-out landing and embedded signup form.
- User goal: understand why 35mm is different, trust it, and create an account.
- Evidence: `01-current-landing.png`, supplied July 25, 2026.

## Verdict

Visually clean, but not yet persuasive enough for a high-converting cold-traffic landing page. The page states
an atmosphere ("conversation") without demonstrating the product, community, or reason to switch from existing
film platforms. Four signup fields arrive before enough value or trust has been established.

## Strengths

- Clear two-column hierarchy.
- Signup action is immediately available.
- Monochrome palette feels controlled; blue is restrained.
- Form labels and login alternative are visible.

## Highest-impact risks

1. **Promise is poetic, not specific.** "Films end. Conversations don't." is memorable but does not explain what
   users get, how 35mm works, or why it is different.
2. **No product proof.** Illustration shows a film community but not the actual feed, posts, replies, profiles,
   or film-linked discussions.
3. **No trust proof.** There are no real member faces, credible community counts, recognizable contributors,
   example discussions, or privacy reassurance. Floating activity notes read as fabricated UI.
4. **Commitment arrives too early.** Four fields plus username availability create friction before visitors have
   seen the product.
5. **Audience is too broad.** "Filmmakers, critics, friends, and people who see cinema differently" does not tell
   any one visitor that this was built specifically for them.
6. **CTA is mechanical.** "Create account" describes account administration, not the value unlocked.
7. **Critical proof is below the headline.** Oversized display type consumes the visual budget while meaningful
   product evidence is absent.

## Recommended direction

- Lead with a concrete product category and differentiator: **"Your live feed for cinema."**
- Explain the loop: **"Follow friends, critics, and filmmakers. See what they're watching, making,
  recommending, and arguing about—then join in."**
- Replace generic illustration/activity notes with a real, high-quality product preview showing one film-linked
  post, replies, and recognizable social context.
- Add honest proof only when available: real beta members, invite count, named creators, or authentic discussion
  examples.
- Test a lower-friction first step such as email or supported OAuth, then collect profile details during
  onboarding.
- Rename primary CTA to **"Join 35mm"** and keep **"Log in"** secondary.

## Accessibility risks visible from screenshot

- Legal/footer text appears very small and may fail comfortable zoom/readability expectations.
- Blue all-caps eyebrow copy can look interactive despite being static.
- Screenshot cannot verify keyboard order, focus visibility, live validation announcements, error recovery,
  screen-reader labels, or contrast ratios.

## Measurement

Do not promise a conversion rate from visual review. Define and instrument:

- landing view → signup start
- signup start → verification sent
- verification sent → verified account
- verified account → first follow
- first follow → day-1 return

Segment by cold paid traffic, organic search, direct visits, and warm referrals. Optimize completed verification
and activation, not button clicks.
