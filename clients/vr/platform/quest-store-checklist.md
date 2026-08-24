# Meta Quest Store checklist

Seated Texas Hold'em — no real-money gambling.

## Performance

- [ ] **72 Hz** sustained on Quest 2 / Quest 3 in 6-max table scene
- [ ] Fixed foveated rendering enabled (`QuestPerformanceBudget`)
- [ ] Draw calls and overdraw profiled; no full-screen blits per frame
- [ ] Photon voice ducking does not stall main thread

## Comfort (VRC review)

- [ ] **Seated default** — `VrClientConfig.seatedMode = true`
- [ ] No snap-turn or smooth-turn locomotion in table scene
- [ ] No artificial locomotion tutorial on first launch
- [ ] Optional vignette for rare standing calibration only

## Content & policy

- [ ] **Simulated gambling** age rating disclosed (`AgeRatingGate`)
- [ ] **Virtual chips only** — no cash-out, no IAP that implies real value
- [ ] Cosmetics are cosmetic; purchase flow shows virtual currency label
- [ ] No loot boxes with undisclosed odds

## Privacy & data safety

- [ ] First-run **privacy disclosure** (`PrivacyDisclosureController`)
- [ ] Data collected: account id, display name, presence poses, hand actions, voice (if enabled)
- [ ] Data not sold; retention documented in privacy policy
- [ ] Account deletion path documented (managed auth provider)

## Technical submission

- [ ] Android APK/AAB signed with upload key
- [ ] Package name final; versionCode increments per upload
- [ ] Meta Quest compatibility: Quest 2, Quest 3, Quest Pro (if supported)
- [ ] Entitlement check via Meta Platform SDK (production)
- [ ] Deep link / invite flow tested

## QA sign-off

- [ ] `StoreComplianceRegistry.AllQuestSatisfied()` true on release candidate
- [ ] Headset removed → audio ducks (`ApplicationFocusHandler`)
- [ ] Offline / server down → graceful error, no soft-lock
