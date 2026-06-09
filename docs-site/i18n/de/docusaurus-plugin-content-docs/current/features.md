---
slug: /features
title: "Eine Idee. Endlose Formate."
description: Was Ideon für Marketingverantwortliche, Gründer und Inhaltsteams tun kann.
keywords: [ideon, features, content generation, ai writing, multi-channel]
sidebar_label: Funktionen
sidebar_position: 1
---

# Eine Idee. Endlose Formate.

Ideon verwandelt eine einzelne Idee in eine vollständige Inhaltskampagne — veröffentlichungsfertige Entwürfe über jeden Kanal, alle mit einer Stimme, einem Stil und einer Strategie.

Gebaut für Marketingverantwortliche, Gründer und schlanke Teams, die hochwertige Inhalte in großem Maßstab veröffentlichen müssen, ohne eine vollständige Redaktion einzustellen.

---

## Einmal schreiben, überall veröffentlichen

Verwandeln Sie eine Idee in einen Artikel, Blog-Beitrag, Newsletter, X-Thread, X-Beitrag, LinkedIn-Beitrag und Reddit-Beitrag — alles in einem einzigen Lauf. Ihr Artikel ist der Anker. Alles andere bewirbt ihn.

```bash
ideon write "Our new AI feature" \
  --primary article=1 \
  --secondary x-thread=2 \
  --secondary linkedin-post=1 \
  --secondary reddit-post=1
```

Kein manuelles Umschreiben derselben Ankündigung auf sieben verschiedene Arten mehr. Ideon passt Struktur, Länge und Ton für jeden Kanal an, während die Kernbotschaft erhalten bleibt.

---

## Schreiben, das nach Ihnen klingt

Wählen Sie einen Stil und eine Absicht. Jede Ausgabe im Lauf teilt sich dieselbe Stimme — sodass Ihr X-Thread so klingt, als käme er vom selben Autor wie Ihr Artikel.

| Stil | Absicht | Ergebnis |
|---|---|---|
| `technical` | `tutorial` | Lehrende Deep-Dives, die Entwickler tatsächlich lesen |
| `professional` | `case-study` | Glaubwürdigkeitsschaffende Gründerinhalte |
| `storytelling` | `announcement` | Produktlaunches, die vom ersten Satz an fesseln |
| `persuasive` | `opinion-piece` | Thought Leadership mit Schärfe |
| `friendly` | `how-to-guide` | Zugängliche, teilbare Tutorials |

**13 Stile.** **13 Absichten.** Eine einheitliche Stimme über jeden Kanal.

---

## Veröffentlichungen und Serien

Organisieren Sie Ihre Inhaltsstrategie mit **Veröffentlichungen** und **Serien**.

**Veröffentlichungen** ermöglichen es Ihnen, redaktionelle Richtlinien, Standardstile, Absichten und Zielgruppenhinweise pro Veröffentlichung zu definieren. Einmal eingerichtet, erbt jeder Schreibdurchlauf unter dieser Veröffentlichung die richtige Stimme.

**Serien** gruppieren verwandte Artikel unter einem gemeinsamen Thema und redaktionellen Faden. Eine Serie kann Veröffentlichungs-Standardwerte überschreiben, und jeder unter ihr geschriebene Artikel erhält kontextbezogene Prompt-Injektion — das LLM weiß, dass es Teil einer größeren Erzählung ist, und behält die thematische Kohärenz bei.

```bash
# Veröffentlichung erstellen
ideon publication add "Tech-Blog" --style technical --intent tutorial --tone authoritative

# Serie darunter erstellen
ideon series add "KI-Tiefenanalysen" --topic "Spitzentechnologien der KI erkunden" --publication tech-blog

# Mit Serienkontext schreiben
ideon write "Wie RAG-Systeme funktionieren" --series ki-tiefenanalysen --primary article=1
```

- **Schichtete Standardwerte** — gespeicherte Einstellungen → Job → Umgebung → Veröffentlichung → Serie → CLI-Argumente
- **Alles überschreibbar** — Serie kann Stil, Absicht, Länge, Inhaltsziele, Modelleinstellungen und redaktionelle Richtlinie überschreiben
- **Eigenständig oder verknüpft** — Serien funktionieren mit oder ohne Veröffentlichung
- **Thematische Injektion** — Serienname und Thema werden in jeden Prompt injiziert für kohärente Multi-Artikel-Erzählbögen

---

## Inhaltswarteschlange

Planen Sie Ihre Inhaltspipeline im Voraus mit der **Inhaltswarteschlange**. Fügen Sie Artikel mit vollständigen Parametersnapshots hinzu und schreiben Sie sie dann einzeln, wenn Sie bereit sind.

```bash
# Artikel für später einreihen
ideon queue add "Wie RAG-Systeme funktionieren" --primary article=1 --publication tech-blog --style technical
ideon queue add "Unser Q3-Produktlaunch" --primary article=1 --secondary x-thread=2 --intent announcement

# Warteschlange anzeigen
ideon queue list

# Nächsten Artikel schreiben
ideon write --from-queue

# Nächsten Artikel für eine bestimmte Veröffentlichung
ideon write --from-queue --publication tech-blog
```

- **Eigenständige Snapshots** — Veröffentlichungs- und Serienstandardwerte werden beim Hinzufügen aufgelöst
- **Atomares Entnehmen** — Gleichzeitige Schreibvorgänge können denselben Eintrag nicht doppelt auswählen
- **Automatische Wiederherstellung** — Fehlgeschlagene oder unterbrochene Schreibvorgänge stellen den Eintrag wieder her
- **Überschreiben beim Schreiben** — CLI-Argumente überschreiben Warteschlangeneinstellungen

---

## Datengestützte Inhaltsplanung

Hören Sie auf zu raten, was Sie schreiben sollen. Der `plan`-Befehl von Ideon recherchiert Ihre Inhaltsidee anhand echter Google Keyword Planner-Daten, bewertet Keyword-Chancen, gruppiert sie in thematische Serien und plant einzelne Artikel — alles überprüft durch eine interaktive Terminal-UI, bevor es in Ihrer Warteschlange gespeichert wird.

```bash
# Ein neues Thema erkunden
ideon plan explore "Content-Strategie für B2B SaaS" \
  --publication tech-blog \
  --series-count 3 \
  --articles-per-series 5

# Eine bestehende Serie erweitern
ideon plan expand ai-deep-dives \
  --publication tech-blog \
  --article-count 6
```

- **Zwei Modi** — `explore` für neue Themen, `expand` für die Erweiterung bestehender Serien
- **GKP-gestützt** — Echtes Suchvolumen, Wettbewerb und CPC-Daten untermauern jede Entscheidung
- **KOB-Bewertung** — Keyword Opportunity Benchmark gewichtet Volumen, Intent und Wettbewerb zur Priorisierung
- **Themen-Clustering** — LLM gruppiert ausgewählte Keywords in kohärente Serien mit Pillar-Keywords und Funnel-Stufen
- **Abdeckungsbewusst** — Überspringt bereits veröffentlichte Keywords; zeigt veraltete Inhalte zur Aktualisierung an
- **Interaktive Überprüfung** — Navigieren Sie durch Serien und Artikel im Terminal; genehmigen oder ablehnen Sie vor dem Speichern
- **Agent-bereit** — `--non-interactive` und `--auto-save` für CI- und Automatisierungs-Workflows

[Mehr erfahren →](./guides/content-planning.md)

---

## Recherchegestützte Entwürfe

Ideon durchsucht das Web und fügt kontextbezogene externe Links ein, wie ein menschlicher Autor es tun würde — keine manuelle Recherche, keine generischen Platzhalter-URLs. Nur glaubwürdige, relevante Links, die Ihren Entwürfen Tiefe und Autorität verleihen.

---

## Von Anfang an SEO-optimiert

Ideons Schreib-Pipeline setzt On-Page-SEO-Best-Practices in jeder Stufe der Inhaltsgenerierung durch — nicht als Nachgedanke, sondern als eingebauter Schreibprozess.

**Während der Planung** werden Titel auf suchsichere Längen begrenzt, Meta-Beschreibungen für Klickwirkung gestaltet, und der Planer weist `primaryKeyword` sowie pro Abschnitt `targetKeywords` (0–2 je Abschnitt) mit denselben Platzierungsregeln für nutzer- und LLM-generierte Keywords zu. **Beim Schreiben** formen gestufte Guide-Bundles (Intro / Abschnitt / Outro) und der Keyword-Integration-Guide die Platzierung — Primary Keyword in Titel und Intro, Abschnittsziele in BLUF-Eröffnungsparagraphen. **Nach dem Abschnittsschreiben** läuft standardmäßig die `seo-check`-Stufe mit deterministischem Lint und bei Bedarf einem fünf-Tool-chirurgischen Editor-Agenten (Standard-Pass-Modus `errors-only`; `strict` optional), der Prosa und Metadaten ohne Umstrukturierung korrigiert.

**Während des Schreibens** gestalten drei spezialisierte SEO-Leitfäden jede Sektion:

- **On-Page-Grundlagen** — Überschriftenhierarchie, BLUF-Absätze, Schlüsselerkenntnis-Blöcke und Absatzstruktur, optimiert für menschliche Leser und Such-Crawler
- **E-E-A-T-Signale** — Erfahrung, Expertise, Autorität und Vertrauenswürdigkeit, eingebettet durch Praktiker-Beobachtungen, konkurrierende Standpunkte und Primärquellen-Zitate
- **Faktenichte** — Statistiken, Datenpunkte und autoritative Zitate pro Sektion, inspiriert von Princetons Forschung zur Generativen Engine-Optimierung, die bis zu 40% Sichtbarkeitsgewinne in KI-generierten Zusammenfassungen zeigt

Kein Keyword-Stuffing. Keine SEO-Hacks. Nur diszipliniertes Schreiben, das in traditionellen Suchergebnissen und generativen KI-Zusammenfassungen gleichermaßen performt.

---

## Ihr Modell, Ihre Wahl

Schließen Sie jedes LLM über OpenRouter an. Wechseln Sie die Modelle, ohne Ihren Workflow zu ändern. Verwenden Sie Claude für Nuancen, GPT-4 für Geschwindigkeit oder jedes Modell, das OpenRouter unterstützt — Ideon funktioniert unabhängig davon gleich.

---

## Gebaut auf bewährten Schreibprinzipien

Ideons Schreib-Engine basiert auf einem Leitfaden-ersten Prompt-Kompositionssystem, das aus einem großen Korpus echter Schreibratschläge und Best Practices zusammengestellt wurde. Jede Generierung folgt konkreten Regeln für:

- Struktur und Klarheit
- Spezifität statt Vagheit
- Rhythm und Skannbarkeit
- Aktiv mit konkreten Subjekten
- Kanalnative Auslieferung

Kein generischer KI-Füllstoff. Kein überpolierte Übergänge. Nur disziplinierter, menschlich klingender Prosatext.

---

## Klüger als eine Skill. Günstiger als rohe Prompts.

Die meisten KI-Inhaltstools behandeln das LLM wie eine Black Box, in die man alles einspeist. Ideon nicht. Es steuert die gesamte Pipeline mit deterministischem Code — Planung, Orchestrierung, Formatierung, Dateiverwaltung und Zustandsverfolgung — und ruft das Modell nur auf, wenn tatsächliche Sprachgenerierung erforderlich ist.

Sie zahlen für Token, wenn sie wichtig sind (Prosa-Entwurf, Strukturplanung, Ideenerweiterung) und niemals für Dinge, die Code besser kann (Argumentparsen, Ausgaben routing, Läufe verwalten, Markdown rendern). Im Vergleich zu Agenten-Skills oder universellen LLM-Workflows, die Kontextfenster auf Orchestrierungs-Chat verschwenden, ist Ideon schlanker, schneller und drastisch günstiger im Maßstab.

---

## Visuelles Storytelling, automatisiert

Artikelgeführte Läufe erhalten automatisch generierte Cover- und Inline-Bilder, die über Replicate gerendert werden. Ihre Inhalte sehen so gut aus, wie sie lesen, direkt aus der CLI.

---

## Gebaut für Agenten und Automatisierung

Ideon ist so konzipiert, dass es in moderne Agenten- und CI-Workflows passt:

- **MCP-Server** — Stellen Sie Ideon-Werkzeuge für Claude Code, ChatGPT, Gemini oder jeden MCP-Host bereit
- **Agenten-Laufzeitregistrierung** — `ideon agent install` registriert Integrationsprofile für unterstützte Plattformen
- **Nicht-interaktiver Modus** — `ideon write --no-interactive` entfernt alle Eingabeaufforderungen für CI und Automatisierung
- **Maschinenlesbare Konfiguration** — `ideon config list --json` für Agenten-Inspektion und Orchestrierung
- **Fortsetzbare Läufe** — Setzen Sie genau dort fort, wo Sie aufgehört haben, mit `ideon write resume`

---

## Google Keyword Planner Integration

Abfragen Sie echte Keyword-Daten von Google Ads direkt aus der CLI oder über MCP-Werkzeuge:

- **Keyword-Ideen** — Generieren Sie verwandte Keywords aus Seed-Keywords, einer URL oder einer Seite
- **Historische Metriken** — Erhalten Sie Suchvolumen, Wettbewerb und CPC-Daten für jedes Keyword
- **Prognosedaten** — Projizieren Sie Impressionen, Klicks und Kosten für Keyword-Kampagnen

```bash
ideon gkp ideas --keywords seo,marketing --country US
ideon gkp historical --keywords seo --json
ideon gkp forecast --keywords seo --match-type EXACT --country US
```

Richten Sie Anmeldeinformationen einmal mit `ideon gads login` ein und fragen Sie dann Keyword-Daten aus der CLI ab oder stellen Sie sie jedem MCP-kompatiblen Agenten bereit.

---

## Bereit, mehr Inhalte zu veröffentlichen?

[Loslegen →](./getting-started/installation.md)

Oder springen Sie direkt zur [CLI-Referenz](./reference/cli-reference.md) und [Schreibleitfaden](/writing-guide).