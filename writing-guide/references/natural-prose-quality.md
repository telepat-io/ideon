# Natural Prose Quality

Use this guide to polish draft prose for readability and voice. Apply these rules as a post-draft editing pass focused on reader experience — not on evading automated classifiers.

## Overused Vocabulary

Replace these tired words with plainer alternatives:

| Overused | Natural Substitute |
|---|---|
| delve | examine, explore, look into |
| intricate tapestry | complex system, interconnected structure |
| realm | area, field, domain |
| testament | evidence, proof, demonstration |
| nuance | subtlety, detail, distinction |
| catalyst | trigger, driver, spark |
| comprehensive | thorough, complete, full |
| significant | large, important, major |
| crucial | key, central, essential |
| vital | critical, necessary |
| ever-evolving | changing, shifting, developing |
| leverage | use, apply, draw on |
| utilization | use, usage |
| streamline | simplify, speed up, smooth out |
| synergy | working together, combination, alignment |
| cutting-edge | advanced, new, latest |
| game-changing | transformative, breakthrough |
| unlock the power | use, access, harness |
| take to the next level | improve, advance |

## Rule: Remove Hedging Language
Description: Words and phrases that weaken assertions without adding precision should be deleted entirely. State the claim directly or support it with evidence.
Negative example: "It is important to note that container orchestration generally speaking tends to be arguably one of the more effective approaches to managing deployments at scale."
Positive example: "Container orchestration manages deployments at scale. A 2024 CNCF survey found that teams using Kubernetes report 64% fewer deployment-related incidents than teams using manual scripts."

## Rule: Replace Formulaic Transitions
Description: Academic transition words create a predictable, robotic rhythm. Use conversational connectors or transition through context instead.
Negative example: "Furthermore, the data indicates improved performance. Moreover, the cost savings are substantial. In conclusion, the approach is recommended."
Positive example: "The data also shows better performance. What surprised us was the cost impact: a 30% drop in the first quarter alone. Bottom line: the approach works, and the numbers back it up."

## Rule: Vary Sentence Length Intentionally
Description: Alternating short and long sentences improves readability. After drafting, check for runs of 3+ sentences of similar length and break the pattern.
Negative example: Five consecutive sentences of 18-22 words each, creating a monotonous rhythm.
Positive example: "The deployment failed. Not because of a bug — the code was clean, the tests passed, and the staging environment was green. It failed because the production database had a connection pool limit of 20, and the new service opened 15 connections per instance. Three instances later, the pool was exhausted. Nobody saw it coming."

## Rule: Avoid Repetitive Sentence Openers
Description: Three or more consecutive sentences that begin the same way create syntactic flatness. Vary your openers deliberately.
Negative example: "The system processes requests. The system logs each transaction. The system alerts on failures. The system auto-scales under load."
Positive example: "The system processes incoming requests. Each transaction is logged with a unique trace ID. When failures occur, an alert fires within 30 seconds. Under heavy load, the auto-scaler provisions additional capacity."

## Rule: Use Standard Contractions in Non-Academic Contexts
Description: In all formats except `science-paper` and `press-release`, use standard English contractions (don't, won't, can't, it's, you're, they're) when the tone allows.
Negative example: "You do not need to configure the database manually. It is handled automatically by the migration tool. You will not encounter issues unless you are using a custom schema."
Positive example: "You don't need to configure the database manually — it's handled by the migration tool. You won't encounter issues unless you're using a custom schema."

## Post-Draft Self-Audit Checklist

After completing a draft, scan for these five signals before finalizing:

1. **Vocabulary scan:** Search for any word in the Overused Vocabulary table. Replace or remove.
2. **Hedging scan:** Search for "generally," "typically," "tends to," "arguably," "it is important to note." Delete and restate directly.
3. **Transition scan:** Search for "furthermore," "moreover," "consequently," "in conclusion," "subsequently." Replace with natural alternatives.
4. **Rhythm scan:** Read three random paragraphs aloud. If every sentence feels the same length, break one into a short punch or combine two into a longer complex sentence.
5. **Opener variety scan:** Check the first three words of each sentence in one section. If a pattern repeats (e.g., "The system..." starting 4 sentences in a row), rewrite to vary structure.
