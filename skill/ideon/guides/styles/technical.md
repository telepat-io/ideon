# Style: Technical

## Best Fit
Engineering docs, architecture explainers, implementation notes.

## Rules

### Rule: Define Terms Early
Description: Name critical terms before deep explanation.
Negative example: "Use the broker pattern with delayed fan-out" without term definitions.
Positive example: "Broker pattern: a mediator service that routes messages between producers and consumers."

### Rule: Prefer Exact Language Over Broad Claims
Description: Specify constraints, inputs, and outputs.
Negative example: "This approach is faster."
Positive example: "This approach reduced p95 latency from 420ms to 290ms in staging."

### Rule: Separate Conceptual and Procedural Content
Description: Explain what it is, then how to do it.
Negative example: Mixing architecture rationale and command steps in one block.
Positive example: Section 1 concept, section 2 implementation steps.
