# TODO triage

Everything below is a judgment call left in the code as `TODO`/dead code.
Grouped by theme so each group can become an issue (or be deleted) in one
go. Line numbers are approximate - search the quoted text.

Czech notes are translated where they matter. Nothing here is verified
beyond reading; several items may already be obsolete.

## Frontend

### A. Exercise UX feedback that was never built (needs product calls)

Students currently get silence in all of these situations:

- `ExerciseBox.tsx` ~270/389: "say user it is in normal form and they are mistaken"
- `ExerciseBox.tsx` ~316/431: "say user it was incorrect"
- `ExerciseBox.tsx` ~334/337 and ~449/452: "print syntax error",
  plus ~335/450: "do it locally - no missuse of onSubmit"
  ("...or something like that, the messages prop inside EvaluatorState
  will be used for that" - i.e. the intended channel exists but was
  never wired up)
- `ExerciseBox.tsx` ~249/370: "do something about it" (both sit on
  branches where a reduction unexpectedly comes back empty)
- `ExerciseBox.tsx` ~64 and `ExpressionBox.tsx` ~65:
  "Maybe I will take this out" (both guard the same stepping helper)

Recommendation: one "exercise feedback" issue covering the whole group -
implementing any single message in isolation will look inconsistent.

### B. Immutability / duplication refactors (needs engineering calls)

- `ExpressionBox.tsx` ~472/518/581/608: "consider immutability"
  (evaluator state is mutated in place during stepping)
- `ExerciseBox.tsx` ~251/372: same note, same pattern
- `ExpressionBox.tsx` ~496: "completely same code as in breakpoint
  section -- refactor and unify pls", plus ~511/601 "maybe refactor
  a little"
- `ExerciseBox.tsx` ~270/389: "refactor PLS - update history"

Recommendation: single refactor issue; risky to do blindly because the
stepping/history logic is subtle and barely tested (one smoke test).

### C. Breakpoints rework (Czech, needs your memory)

- `ExerciseBox.tsx` ~650 and `ExpressionBox.tsx` ~657:
  "breakpointy se pak jeste musi predelat"
  ("breakpoints will still have to be redone later")
- `ExpressionBox.tsx` ~658: "don't forget on GAMA refactor"

Recommendation: confirm breakpoints are even a wanted feature before
touching; otherwise delete the dead breakpoint code paths outright.

### D. ANCHOR #0023 - disabled "crazy" code (likely live-bug adjacent)

Identical blocks in `ExerciseBox.tsx` (~626) and `ExpressionBox.tsx`
(~384), introduced by commit "ANCHOR: #0023":

> NOTE: This is completely crazy - it doesn't make any sense
> TODO: Investigate more - and fix the functionality
> it probably should check if the current AST Root is a Macro and next
> Reduction is Expansion of exactly this AST ...

The commented-out sketch suggests Macros/ChurchNumerals should count as
normal form under some setting. Recommendation: decide delete vs. fix;
if fix, it belongs with group A (user-visible "you are done" signal).

### E. Corrupt-notebook handling (needs error-design call)

`untyped-lambda-integration/Constants.ts`:

- ~134: "please fix it - tokenize should accept Array<MacroName> -
  each evaluator needs to accept the SLI and possibly other configs?
  so the CORE can be absolutely unopinionated about expansions"
  (architecture question spanning both repos)
- ~295/307: "repair:" - both are `throw Error("... NOT DECODABLE")`
  paths when loading stored notebooks/histories; the repair sketches
  (re-parse, re-step) were never implemented, so a corrupt entry
  kills the whole notebook load
- ~316: "maybe instead of this theatre just use the Core Evaluator
  and get real instance of ASTReduction"
- ~327: "as AST this is unsafe" (a cast on decoded history steps)
- ~992: "implement later" (check what it guards before deleting)

Recommendation: keep the throws (they are honest), file one issue for
"loading must not die on one bad box".

### F. Small renames and cosmetics (safe to do anytime)

- `ExerciseSwitch.tsx` ~15: "maybe not really needed or rename it
  accordingly" (needs a target name from you)
- `Types.ts` ~30/34: `LispBox`/`LispSettings` are empty placeholders
  ("delete this placeholder and implement it"); ~41: "this needs to
  be reconsidered" (`GlobalSettings` shape); ~54: "refactor to use
  the Dictionary"
- `TopBar.tsx` ~69: download filename is hardcoded
  `notebook_lambdulus.lus` ("change the name according to the
  notebook name") - tiny feature, needs the naming rule from you
- `TopBar.tsx` ~72: "I shouldn't NOT do this - but if I revoke I
  can't click it again without re-render" (object-URL revocation)
- `App.tsx` ~48: "all of this needs to be moved to more apropriate
  component" (theme + loading logic); ~102/111: history pushState/
  replaceState to '/' ("decide if remove or leave")
- `screens/Notebook.tsx` ~160: "I may not need onBlur handling in
  the future"; the box-extract refactor note is done except the typo
  (fixed)
- `untyped-lambda-integration/Settings.tsx` ~36/83: "tohle bude
  rozhodne chtit prepsat" ("this will definitely want rewriting" -
  hardcoded `disabled={ false }` props)
- `TreeComparator.ts` ~7: "fix the public equals interface, maybe
  public get and private set?"; ~18: "I need to compare roots first";
  ~24 (not a TODO comment, reads as one): "compare need to compare
  both children if got" - the comparator is suspicious, needs a test
  before any change
- `Expression.tsx` ~98: "maybe I shouldn't do this"
  (`e.stopPropagation()`)
- `components/Editor.tsx` ~55: "Editor should not decide that - it
  should only implement onEnter onShiftEnter onCtrlEnter"
- `components/CreateBox.tsx` ~16: "this needs to change" (no detail -
  ask before touching)
- `components/DebugControls.tsx` ~8/14/30/51: F9 handling is "just
  for now -- because I am not sure students will know how to
  exercise with simplified" (curriculum call, not code)
- `markdown-integration/Note.tsx` ~40: "tohle musim nejak vyresit -
  mozno ta metoda setBoxState v APP bude checkovat propisovat do URL"
  ("I have to solve this somehow - maybe setBoxState in APP will
  check/propagate into the URL"); ~43: isFocused handling removed
  "just for now"
- `untyped-lambda-integration/Settings.tsx` ~40/64/87:
  "tady nejakej destructuring" ("some destructuring here" - trivial
  style cleanup, safe)
- `ReactPrinter.tsx`: "temporary and very dirty hot fix" (~12),
  "same here" (~73/268/312), "little bit refactored, maybe keep
  going" (~147/242), "probably not good, other way" (~196),
  "not so elegant" (~244), "does nothing - maybe delete" (~331) -
  needs a careful pass with print-output tests, not blind deletion

## Core

- Parser `@dynamic-macros` markers (`parser.ts` ~133/141,
  `parser/index.ts` ~48/52/62, `ast/macro.ts` ~12/23): the old vision
  of pre-parsed macro definitions - explicitly parked, do not touch
  without the design discussion.
- `parser/index.ts` ~37: "TODO: remove" (above the commented-out
  `toAst` sketch); ~49: "eventually this copying wouldn't be
  necessary" (the per-parse macro-table merge).
- `parser.ts` ~209/214/220: error-reporting notes (would be solved by
  introducing a real `ParseError` with position instead of string
  throws); ~250: "real fun if I used parser itself...".
- `lexer/lexer.ts` ~112: "position is not correct - fix this!"
  (token positions - matters for future error messages).
- `lexer/index.ts` ~14: "I may not need LambdaLetters - frontend
  could work that for me" (API design, ties to frontend).
- `lexer/token.ts` ~16: "discard readonly?".
- `index.ts` ~8: "tohle pujde do svejch ruznejch souboru"
  ("this will go into its own various files" - export organization).
- Evaluator Czech notes (`normalabstractionevaluator.ts` ~73/77/84:
  "nalevo nebude vzdycky macro" / "jakto ze to bude vzdycky makro?"
  ("there won't always be a macro on the left" / "how come it will
  always be a macro?"), "tohle je spatne" ("this is wrong"),
  "tohle je jenom prozatim" ("this is only for now"); ~136: user
  macro expansion question; `simplifiednormalevaluator.ts` ~73/132
  and `normalabstractionevaluator.ts` ~75/150: "make arity its own
  prop / refactor with helper"; `applicativeevaluator.ts` ~94:
  "just experimenting") - all behavioral, needs your memory.
- `reductions/gama.ts` ~11: "consider redexes: List<Application>";
  `reductions/beta.ts` ~5: "vyresit pro pripady kdy jde o multilambdu"
  ("solve for the multilambda cases").
- `visitors/basicprinter.ts` ~29/44: "try to refactor this".
- Test-file `// TODO: ... OK` notes in `expressions.test.ts` just
  label which invalid case each line covers - intentional, keep.
