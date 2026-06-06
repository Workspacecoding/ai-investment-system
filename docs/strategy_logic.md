# Strategy Logic

Strategy modules should expose deterministic inputs and outputs.

Inputs:

- Instrument universe.
- Price history and volume.
- Fundamental and ETF metadata.
- News and industry context.
- Risk profile and investment goal.

Outputs:

- Candidate list.
- Signal breakdown.
- Confidence score.
- Risk flags.
- Recommended holding period.

Scoring should separate signal calculation from AI explanation so backtests remain reproducible.
