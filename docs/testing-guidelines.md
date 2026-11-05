# Testing Guidelines

Common rules for writing tests that are useful, readable, and survive refactors.

## What to test

1. **Test behavior, not implementation.** Ask "what does it do?", not "how does it do it?". If you refactor and the behavior stays the same, the tests should stay green.
2. **Test through the public interface.** Inputs in, outputs and observable effects out. Don't reach into private functions or internal state.
3. **Test the flows users actually go through.** Rules that should never happen belong in types, not tests. If a test needs `as any` to reach a case, the type system probably already prevents it.
4. **Every rule you care about gets a test.** If you can name it, test it. If deleting a line doesn't break any test, either that line or your tests have a gap.

## How to write them

5. **Arrange, act, assert.** Set up, do one thing, check the result. Keep the three parts visually separate.
6. **One behavior per test**, which isn't the same as one assertion. Several assertions are fine when they describe the same outcome.
7. **Assert the whole result when the shape is the behavior** (e.g. `toEqual` on an initial state). Check only the relevant field when it isn't (`toMatchObject`, or a single property).
8. **Expected values are literals or data, never computed by reusing production logic.** Importing constants is fine. Reimplementing the algorithm in the test is not, because then the test can only ever agree with the code.
9. **Keep the setup that matters visible inside the test.** Use factory helpers with defaults and pass only what makes the test special. Avoid shared mutable state set up in `beforeEach`.

## Naming

10. **Name tests after the rule, not the data.** "defaults the rate to 0" reads well; "item with 0%" doesn't, and neither does a vague "works properly".
11. **Use `describe` for the setup and `it` for what happens.** Together they read as a sentence: *"when started with existing items, appends a new default item"*.

## Reliable tests

12. **Each test is independent.** Fresh instances every time, no order dependence, no leaked state between tests.
13. **Control randomness and time.** Inject ids, clocks, and other non-deterministic sources. Use `expect.any()` only when the value really doesn't matter.
14. **Never use arbitrary sleeps.** Wait for a condition, not a duration.
15. **Assert on outcomes that don't break easily.** Prefer assertions that keep working when unrelated details change (e.g. partial matches over exact internal structure).

## The TDD loop

16. **Red: see it fail for the right reason.** A test that has never failed hasn't proven anything.
17. **Green: write the simplest code that passes,** even if it looks naive. The next test will push the design forward.
18. **Refactor only while green,** and refactor the tests too. Test code is real code.
19. **Pick the next test to be the smallest step that forces new behavior.** Simple cases first (creation, defaults), then main flows, then edge cases (failures, boundaries).
20. **When a test is painful to write, that's design feedback.** Heavy mocking, casts, or long setup usually mean the code needs a seam: inject a dependency, or extract a pure function.

---

If you only keep three: **test behavior, keep tests independent, and treat hard-to-test code as a design problem.**
