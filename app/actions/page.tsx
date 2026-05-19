import type { Metadata } from "next";

export const metadata: Metadata = { title: "Actions" };

const ICON = "❖";

type ActionEntry = { name: string; ap: string; description: string };
type Subsection = { name: string; actions: ActionEntry[] };
type Section = { name: string; subtitle: string; subsections: Subsection[] };

const COMPLEXITY_SCALE = [
  {
    level: "Simple / Easy",
    ap: "1 AP",
    examples: "Flip furniture, draw a weapon, shout a command",
  },
  {
    level: "Advanced / Medium",
    ap: "2 AP",
    examples: "Cause destruction, disarm a trap, calm an ally",
  },
  {
    level: "Complex / Hard",
    ap: "3 AP",
    examples: "Manipulate fire, redirect a spell, jury-rig equipment",
  },
  {
    level: "Elaborate / Arduous",
    ap: "4 AP",
    examples: "Tear out a pillar and swing it, reshape terrain",
  },
];

const SECTIONS: Section[] = [
  {
    name: "Offensive",
    subtitle:
      "Actions taken with intent to cause harm, whether lethal or non-lethal.",
    subsections: [
      {
        name: "Weapon",
        actions: [
          {
            name: "Quick Scrape",
            ap: "1 AP",
            description:
              "On hit, deal half weapon damage only. May also bash with a shield. Critical: full weapon damage, no modifiers.",
          },
          {
            name: "Strike",
            ap: "2 AP",
            description:
              "On hit, deal weapon damage dice + modifiers. Critical: deal damage equal to half of weapon's max damage (e.g. 2d6 on crit deals an additional 6). Dual wielding: two attack rolls, add modifier once.",
          },
          {
            name: "Power Strike",
            ap: "3 AP",
            description:
              "Attack at −5 to roll. On hit, deal double damage dice + modifiers. Critical: same as Strike. Dual wielding: one attack roll for both weapons.",
          },
        ],
      },
      {
        name: "Magic",
        actions: [
          {
            name: "Cast a Spell",
            ap: "2 AP",
            description:
              "Use a Prepared Spell or Cantrip. Attack roll using spellcasting modifier. Critical hit or target critical failure on save: trigger critical spell effects; damage spells deal at minimum half the spell's damage.",
          },
          {
            name: "Charged Cantrip",
            ap: "3 AP",
            description:
              "Use a damaging Cantrip. On hit, deal double damage dice + modifiers if applicable. Critical: deal damage equal to half of cantrip's max damage.",
          },
        ],
      },
    ],
  },
  {
    name: "Maneuver",
    subtitle: "Requires you not be Restrained (for movement actions).",
    subsections: [
      {
        name: "Movement",
        actions: [
          {
            name: "Dash",
            ap: "2 AP",
            description: "Move to an adjacent zone.",
          },
          {
            name: "Disengage",
            ap: "1 AP",
            description: "Break free from Engagement and regain movement.",
          },
          {
            name: "Flank",
            ap: "1 AP",
            description:
              "Give an ally Resolve on their next attack roll against any target in the Engagement.",
          },
          {
            name: "Go Prone / Stand",
            ap: "1 AP",
            description: "Toggle between Standing and the Prone condition.",
          },
        ],
      },
      {
        name: "Control",
        actions: [
          {
            name: "Shove",
            ap: "1 AP",
            description:
              "Push a target out of your Engagement or into a hazard. Attack roll: Body vs. Body Defense.",
          },
          {
            name: "Trip",
            ap: "2 AP",
            description:
              "Knock a target down, inflicting Prone. Attack roll: Body vs. Body Defense.",
          },
          {
            name: "Grapple",
            ap: "2 AP",
            description:
              "Inflict the Restrained condition. Attack roll: Body vs. Body Defense.",
          },
        ],
      },
    ],
  },
  {
    name: "Utility",
    subtitle: "Actions that protect yourself or interact with the environment.",
    subsections: [
      {
        name: "Preservation",
        actions: [
          {
            name: "Dodge",
            ap: "2 AP",
            description:
              "Gain Strain on incoming attacks until your next turn.",
          },
          {
            name: "Hide",
            ap: "2 AP",
            description:
              "Make a Stealth check. In combat: become Obscured. Outside combat: become Hidden.",
          },
          {
            name: "Cover",
            ap: "1 AP",
            description:
              "Move behind or hold a large object. Gain +2 to Armor vs. ranged attacks or attacks from outside your Zone.",
          },
          {
            name: "Distract",
            ap: "1 AP",
            description:
              "The next attack roll against a chosen ally has Strain.",
          },
        ],
      },
      {
        name: "Interact",
        actions: [
          {
            name: "Assist / Aid",
            ap: "1 AP",
            description:
              "Target within Touch range. Remove Burning or Bleeding condition, or grant bonus dice equal to your Skill pool on a Proficient skill check.",
          },
          {
            name: "Interact",
            ap: "0→1 AP",
            description:
              "Interact with an object within range. Free on first use; costs 1 AP on subsequent uses per turn.",
          },
          {
            name: "Scan / Perception",
            ap: "1 AP",
            description:
              "Make a Mind check to reveal Hidden or Obscured targets.",
          },
          {
            name: "Hold Action",
            ap: "Action-based",
            description:
              "Declare an action and a trigger. When the trigger occurs, you may act. Cannot target a creature using Disengage.",
          },
          {
            name: "Alchemical Item",
            ap: "2 AP",
            description:
              "Use an alchemical item on yourself or a target within the item's range.",
          },
          {
            name: "Command",
            ap: "1→3 AP",
            description:
              "Issue commands to a summoned creature or pet, expending your AP instead of theirs for actions of 2 AP or less. Cost increases each use up to 3 AP.",
          },
          {
            name: "Brace",
            ap: "1 AP",
            description:
              "Use an item with the Brace trait. Gain +2 to attack (weapon) or +2 to Armor Defense (shield or armor).",
          },
        ],
      },
    ],
  },
];

const SECTION_COLORS: Record<string, string> = {
  Offensive: "var(--section-offensive)",
  Maneuver: "var(--section-maneuver)",
  Utility: "var(--section-utility)",
};

export default function ActionsPage() {
  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 0 3rem" }}>
      {/* Page header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "1.75rem",
            color: "var(--text)",
            margin: "0 0 0.25rem",
          }}
        >
          Actions
        </h1>
        <p
          style={{
            fontSize: "0.925rem",
            color: "var(--text-muted)",
            margin: "0 0 0.875rem",
            lineHeight: 1.55,
          }}
        >
          All combat and narrative actions available to characters, grouped by
          type.
        </p>
        {/* AP info banner */}
        <div
          style={{
            padding: "0.625rem 1rem",
            backgroundColor: "var(--primary-light)",
            border: "1px solid var(--primary)",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            color: "var(--text)",
            lineHeight: 1.5,
          }}
        >
          <strong
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--primary)",
            }}
          >
            Action Points (AP)
          </strong>{" "}
          — All creatures start with <strong>4 AP</strong> at the beginning of
          each round, which refreshes at the start of their next turn.
        </div>
      </div>

      {/* Main sections */}
      {SECTIONS.map((section) => (
        <div key={section.name} style={{ marginBottom: "2.5rem" }}>
          {/* Section header */}
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.875rem 1.25rem",
              backgroundColor: SECTION_COLORS[section.name] ?? "var(--bg-nav)",
              borderRadius: "0.625rem",
              border: "1px solid var(--border)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "1.15rem",
                color: "var(--text)",
                margin: "0 0 0.2rem",
              }}
            >
              {section.name}
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-muted)",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {section.subtitle}
            </p>
          </div>

          {/* Subsections */}
          {section.subsections.map((sub) => (
            <div key={sub.name} style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-heading)",
                  marginBottom: "0.5rem",
                  paddingBottom: "0.25rem",
                  borderBottom: "2px solid var(--border)",
                  display: "inline-block",
                }}
              >
                {sub.name}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {sub.actions.map((action) => (
                  <div
                    key={action.name}
                    style={{
                      padding: "0.875rem 1.125rem",
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.625rem",
                      display: "flex",
                      gap: "0.875rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "var(--primary)",
                        flexShrink: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {ICON}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "0.625rem",
                          flexWrap: "wrap",
                          marginBottom: "0.275rem",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-heading)",
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "var(--text)",
                          }}
                        >
                          {action.name}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 700,
                            padding: "0.1rem 0.45rem",
                            borderRadius: "9999px",
                            backgroundColor: "var(--accent-light)",
                            color: "var(--accent)",
                            border: "1px solid #FCD34D",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {action.ap}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text)",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {action.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Section 4: When in Doubt */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1.25rem",
            backgroundColor: "var(--accent-light)",
            borderRadius: "0.625rem",
            border: "1px solid #FCD34D",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "1.15rem",
              color: "var(--text)",
              margin: "0 0 0.2rem",
            }}
          >
            When in Doubt, Get Creative
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            Not sure if something costs AP, or don&apos;t see it on the action
            list or a Feat? Use this complexity scale — and when in doubt, ask
            your GM and the table.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.625rem",
          }}
        >
          {COMPLEXITY_SCALE.map((row) => (
            <div
              key={row.level}
              style={{
                padding: "0.875rem 1rem",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "0.625rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.3rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "var(--text)",
                  }}
                >
                  {row.level}
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    padding: "0.1rem 0.45rem",
                    borderRadius: "9999px",
                    backgroundColor: "var(--accent-light)",
                    color: "var(--accent)",
                    border: "1px solid #FCD34D",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.ap}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {row.examples}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
