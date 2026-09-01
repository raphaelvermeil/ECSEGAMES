"use client";

import { Fragment, type CSSProperties } from "react";
import Image from "next/image";
import {
  type CrewId,
  type TeamMember,
  groupByCrew,
  initials,
  firstName,
} from "@/lib/team";

// SCENE_WIDTH is grown well past the original 1436-wide composition so that
// ScaledScene — which always stretches this scene to fill the container's
// full width — renders that composition noticeably smaller, without ever
// leaving blank letterboxing at the sides. Every hand-placed x-position
// (decor, fireflies, crew clusters) is stretched by DECOR_STRETCH_X so the
// whole picture spreads out to use the new width, rather than staying
// bunched in the original 1436px-wide area with dead space on the sides.
export const SCENE_WIDTH = 1916;
export const SCENE_HEIGHT = 786;
const ORIGINAL_CONTENT_WIDTH = 1436;
const DECOR_STRETCH_X = SCENE_WIDTH / ORIGINAL_CONTENT_WIDTH;

export interface SunState {
  // Percent-of-scene position. `animated` drives the CSS ecSun drift
  // (desktop); when false, leftPct/topPct are taken as-is every render,
  // which is how the mobile view drives the sun frame-by-frame from JS.
  leftPct: number;
  topPct: number;
  animated: boolean;
  periodSeconds: number;
}

interface CampSceneProps {
  members: TeamMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sun: SunState;
}

// Every decorative scene element. CSS properties are passed as plain props
// (left, top, background, ...); an optional nested `style` prop carries
// anything that can't be a prop name directly (transform, border, ...).
function Dec({ style, ...rest }: CSSProperties & { style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", ...rest, ...style }}
    />
  );
}

const RING_BY_CREW: Record<CrewId, string> = {
  co: "#28563b",
  comms: "#2c5e40",
  tech: "#28563b",
  day: "#2c5e40",
  night: "#28563b",
  gen: "#1f4831",
  ise: "#1f4831",
};

const BOB_SECONDS: Record<CrewId, number> = {
  co: 3.6,
  comms: 3.9,
  tech: 3.4,
  day: 3.7,
  night: 3.2,
  gen: 3.5,
  ise: 4.1,
};

const MARGIN_X: Record<CrewId, number> = {
  co: 15,
  comms: 4,
  tech: 16,
  day: 22,
  night: 24,
  gen: 14,
  ise: 4,
};

const DY_OVERRIDES: Partial<Record<CrewId, string[]>> = {
  day: ["-9px", "21px"],
  tech: ["10px", "10px"],
  gen: ["-16px", "-16px", "-16px"],
};
const DX_OVERRIDES: Partial<Record<CrewId, string[]>> = {
  day: ["-18px", "18px"],
};

const CREW_COLOR: Record<CrewId, string> = {
  co: "#ffd166",
  comms: "#ff7b54",
  tech: "#6ee787",
  day: "#7fd1ff",
  night: "#b39cff",
  gen: "#e9f5cd",
  ise: "#58d6a8",
};

// Base sky/terrain/lake decor, drawn behind everything else — positions are
// relative to the 1436x786 scene, not to any cluster.
const SCENE_DECOR: CSSProperties[] = [
  { left: 0, right: 0, top: 0, height: 118, background: "#233b52" },
  { left: 0, right: 0, top: 118, height: 66, background: "#3c4a5e" },
  { left: 0, right: 0, top: 184, height: 48, background: "#6b5560" },
  { left: 0, right: 0, top: 232, height: 38, background: "#a3695a" },
  { left: 0, right: 0, top: 270, height: 24, background: "#d99a5b" },
  {
    left: 120,
    top: 96,
    width: 180,
    height: 9,
    background: "rgba(255,205,150,.2)",
    boxShadow:
      "60px 26px 0 -1px rgba(255,205,150,.16),-40px 52px 0 -3px rgba(255,205,150,.12)",
  },
  {
    left: 760,
    top: 126,
    width: 230,
    height: 8,
    background: "rgba(255,205,150,.16)",
    boxShadow: "80px 30px 0 -2px rgba(255,205,150,.13)",
  },
  {
    left: 430,
    top: 74,
    width: 7,
    height: 2,
    background: "rgba(233,245,205,.5)",
    boxShadow:
      "5px -3px 0 0 rgba(233,245,205,.5),46px 22px 0 0 rgba(233,245,205,.4),51px 19px 0 0 rgba(233,245,205,.4),96px 6px 0 0 rgba(233,245,205,.35),101px 3px 0 0 rgba(233,245,205,.35)",
  },
  {
    left: 60,
    top: 180,
    width: 150,
    height: 114,
    background: "#182633",
    boxShadow: "inset 0 5px 0 #21323f",
  },
  {
    left: 86,
    top: 206,
    width: 12,
    height: 16,
    background: "rgba(255,209,102,.75)",
    boxShadow:
      "34px 0 0 0 rgba(255,209,102,.5),68px 0 0 0 rgba(255,209,102,.7),0 34px 0 0 rgba(255,209,102,.45),34px 34px 0 0 rgba(255,209,102,.7),68px 34px 0 0 rgba(255,209,102,.4)",
  },
  { left: 236, top: 214, width: 96, height: 80, background: "#14212c" },
  {
    left: 258,
    top: 236,
    width: 11,
    height: 14,
    background: "rgba(255,209,102,.55)",
    boxShadow:
      "30px 0 0 0 rgba(255,209,102,.35),0 28px 0 0 rgba(255,209,102,.6),30px 28px 0 0 rgba(255,209,102,.3)",
  },
  {
    left: 492,
    top: 166,
    width: 186,
    height: 128,
    background: "#182633",
    boxShadow: "inset 0 5px 0 #22333f",
  },
  { left: 560, top: 132, width: 52, height: 38, background: "#182633" },
  {
    left: 520,
    top: 196,
    width: 13,
    height: 17,
    background: "rgba(255,209,102,.7)",
    boxShadow:
      "38px 0 0 0 rgba(255,209,102,.45),76px 0 0 0 rgba(255,209,102,.65),114px 0 0 0 rgba(255,209,102,.35),0 40px 0 0 rgba(255,209,102,.5),38px 40px 0 0 rgba(255,209,102,.7),76px 40px 0 0 rgba(255,209,102,.4),114px 40px 0 0 rgba(255,209,102,.6)",
  },
  { left: 1180, top: 196, width: 210, height: 98, background: "#152230" },
  {
    left: 1208,
    top: 222,
    width: 12,
    height: 15,
    background: "rgba(255,209,102,.5)",
    boxShadow:
      "36px 0 0 0 rgba(255,209,102,.7),72px 0 0 0 rgba(255,209,102,.35),108px 0 0 0 rgba(255,209,102,.6),144px 0 0 0 rgba(255,209,102,.4)",
  },
  {
    left: 0,
    right: 0,
    top: 262,
    height: 44,
    background: "#1d3a2f",
    clipPath:
      "polygon(0 100%,3% 30%,6% 100%,10% 42%,13% 100%,17% 26%,20% 100%,24% 46%,27% 100%,31% 30%,34% 100%,38% 44%,41% 100%,45% 28%,48% 100%,52% 40%,55% 100%,59% 32%,62% 100%,66% 46%,69% 100%,73% 28%,76% 100%,80% 40%,83% 100%,87% 30%,90% 100%,94% 44%,97% 100%,100% 34%,100% 100%)",
  },
  { left: 0, right: 0, top: 294, bottom: 0, background: "#2c5e40" },
  { left: 0, right: 0, top: 294, height: 7, background: "#5c8f4e" },
  { left: 0, right: 0, top: 430, bottom: 0, background: "#28563b" },
  { left: 0, right: 0, top: 430, height: 6, background: "#54864a" },
  { left: 0, right: 0, top: 700, bottom: 0, background: "#1f4831" },
  { left: 0, right: 0, top: 700, height: 6, background: "#457642" },
  {
    left: 0,
    right: 0,
    top: 512,
    height: 56,
    background: "#6b5a3f",
    boxShadow: "inset 0 5px 0 #8a7550,inset 0 -4px 0 #59492f",
  },
  {
    left: 0,
    right: 0,
    top: 538,
    height: 3,
    background:
      "repeating-linear-gradient(90deg,rgba(233,245,205,.32) 0 26px,transparent 26px 60px)",
  },
  {
    left: 1128,
    top: 632,
    width: 280,
    height: 96,
    borderRadius: "50%",
    background: "#2b5c68",
    boxShadow:
      "inset 0 7px 0 rgba(255,217,138,.2),inset 0 -14px 0 rgba(12,40,48,.22),inset 0 0 0 5px rgba(93,142,132,.18)",
  },
  {
    left: 1156,
    top: 648,
    width: 224,
    height: 64,
    borderRadius: "50%",
    border: "2px solid rgba(255,217,138,.1)",
  },
  {
    left: 1196,
    top: 666,
    width: 150,
    height: 34,
    borderRadius: "50%",
    border: "2px solid rgba(255,217,138,.07)",
  },
  {
    left: 1240,
    top: 654,
    width: 26,
    height: 2,
    background: "rgba(233,245,205,.14)",
    boxShadow:
      "44px 12px 0 -4px rgba(233,245,205,.12),-58px 26px 0 -6px rgba(233,245,205,.1),96px 30px 0 -8px rgba(233,245,205,.1),16px 44px 0 -6px rgba(233,245,205,.08)",
  },
  {
    left: 74,
    top: 330,
    width: 15,
    height: 58,
    background: "#4a3a26",
    boxShadow: "inset 4px 0 0 #6a5231",
  },
  {
    left: 50,
    top: 272,
    width: 62,
    height: 62,
    background: "#28603d",
    boxShadow: "0 -16px 0 -10px #28603d,inset 8px 8px 0 rgba(255,209,102,.16)",
  },
  {
    left: 404,
    top: 326,
    width: 12,
    height: 46,
    background: "#4a3a26",
    boxShadow: "inset 3px 0 0 #6a5231",
  },
  {
    left: 386,
    top: 288,
    width: 48,
    height: 44,
    background: "#235838",
    boxShadow: "0 -12px 0 -9px #235838,inset 7px 7px 0 rgba(255,209,102,.14)",
  },
  {
    left: 944,
    top: 334,
    width: 14,
    height: 54,
    background: "#4a3a26",
    boxShadow: "inset 4px 0 0 #6a5231",
  },
  {
    left: 920,
    top: 280,
    width: 58,
    height: 58,
    background: "#28603d",
    boxShadow: "0 -14px 0 -10px #28603d,inset 8px 8px 0 rgba(255,209,102,.15)",
  },
  {
    left: 1378,
    top: 342,
    width: 15,
    height: 52,
    background: "#4a3a26",
    boxShadow: "inset 4px 0 0 #6a5231",
  },
  {
    left: 1354,
    top: 288,
    width: 60,
    height: 58,
    background: "#235838",
    boxShadow:
      "0 -15px 0 -10px #235838,-16px 8px 0 -14px #235838,18px 6px 0 -14px #235838,inset 8px 8px 0 rgba(255,209,102,.14)",
  },
  {
    left: 596,
    top: 372,
    width: 62,
    height: 32,
    borderRadius: "29px 29px 6px 6px",
    background: "#235838",
  },
  {
    left: 585,
    top: 379,
    width: 38,
    height: 25,
    borderRadius: "22px 22px 5px 5px",
    background: "#1f5236",
  },
  {
    left: 622,
    top: 368,
    width: 38,
    height: 36,
    borderRadius: "26px 26px 5px 5px",
    background: "#2a6440",
    boxShadow: "inset -6px 5px 0 rgba(255,217,138,.14)",
  },
  {
    left: 792,
    top: 400,
    width: 46,
    height: 24,
    borderRadius: "22px 22px 6px 6px",
    background: "#235838",
  },
  {
    left: 784,
    top: 405,
    width: 29,
    height: 19,
    borderRadius: "17px 17px 5px 5px",
    background: "#1f5236",
  },
  {
    left: 811,
    top: 397,
    width: 29,
    height: 27,
    borderRadius: "19px 19px 5px 5px",
    background: "#2a6440",
    boxShadow: "inset -5px 4px 0 rgba(255,217,138,.14)",
  },
  {
    left: 150,
    top: 670,
    width: 70,
    height: 36,
    borderRadius: "32px 32px 6px 6px",
    background: "#235838",
  },
  {
    left: 137,
    top: 678,
    width: 43,
    height: 28,
    borderRadius: "25px 25px 5px 5px",
    background: "#1f5236",
  },
  {
    left: 179,
    top: 666,
    width: 43,
    height: 40,
    borderRadius: "29px 29px 5px 5px",
    background: "#2a6440",
    boxShadow: "inset -7px 6px 0 rgba(255,217,138,.14)",
  },
  {
    left: 624,
    top: 676,
    width: 54,
    height: 28,
    borderRadius: "25px 25px 6px 6px",
    background: "#235838",
  },
  {
    left: 614,
    top: 682,
    width: 33,
    height: 22,
    borderRadius: "20px 20px 5px 5px",
    background: "#1f5236",
  },
  {
    left: 647,
    top: 673,
    width: 33,
    height: 31,
    borderRadius: "22px 22px 5px 5px",
    background: "#2a6440",
    boxShadow: "inset -5px 4px 0 rgba(255,217,138,.14)",
  },
  {
    left: 1350,
    top: 574,
    width: 58,
    height: 30,
    borderRadius: "27px 27px 6px 6px",
    background: "#235838",
  },
  {
    left: 1340,
    top: 581,
    width: 36,
    height: 23,
    borderRadius: "21px 21px 5px 5px",
    background: "#1f5236",
  },
  {
    left: 1374,
    top: 570,
    width: 36,
    height: 34,
    borderRadius: "24px 24px 5px 5px",
    background: "#2a6440",
    boxShadow: "inset -6px 5px 0 rgba(255,217,138,.14)",
  },
  {
    left: 1074,
    top: 479,
    width: 40,
    height: 21,
    borderRadius: "19px 19px 6px 6px",
    background: "#235838",
  },
  {
    left: 1067,
    top: 484,
    width: 25,
    height: 16,
    borderRadius: "15px 15px 5px 5px",
    background: "#1f5236",
  },
  {
    left: 1091,
    top: 476,
    width: 25,
    height: 24,
    borderRadius: "17px 17px 5px 5px",
    background: "#2a6440",
    boxShadow: "inset -4px 3px 0 rgba(255,217,138,.14)",
  },
  {
    left: 232,
    top: 288,
    width: 34,
    height: 18,
    borderRadius: "16px 16px 6px 6px",
    background: "#235838",
  },
  {
    left: 226,
    top: 292,
    width: 21,
    height: 14,
    borderRadius: "13px 13px 5px 5px",
    background: "#1f5236",
  },
  {
    left: 246,
    top: 286,
    width: 21,
    height: 20,
    borderRadius: "14px 14px 5px 5px",
    background: "#2a6440",
    boxShadow: "inset -3px 3px 0 rgba(255,217,138,.14)",
  },
];

// [left, top, color] — two firefly hues scattered over the grass.
const FIREFLIES: [number, number, string][] = [
  [126, 470, "#3e7a45"],
  [318, 466, "#3e7a45"],
  [470, 486, "#3e7a45"],
  [610, 452, "#3e7a45"],
  [700, 430, "#3e7a45"],
  [786, 470, "#3e7a45"],
  [1058, 452, "#3e7a45"],
  [1236, 470, "#3e7a45"],
  [1400, 440, "#3e7a45"],
  [88, 620, "#357d43"],
  [214, 664, "#357d43"],
  [352, 742, "#357d43"],
  [452, 700, "#357d43"],
  [596, 748, "#357d43"],
  [700, 618, "#357d43"],
  [836, 700, "#357d43"],
  [930, 744, "#357d43"],
  [1058, 764, "#357d43"],
  [252, 330, "#3e7a45"],
  [548, 316, "#3e7a45"],
  [860, 320, "#3e7a45"],
  [1180, 330, "#3e7a45"],
  [1268, 322, "#3e7a45"],
];

// [x, y, color] — small flowers. Authored directly in final SCENE_WIDTH
// coordinates (no DECOR_STRETCH_X needed). Concentrated in the lower grass
// band, which was otherwise mostly empty, with a lighter sprinkle up top so
// the rest of the scenery gets a bit more too.
const FLOWERS: [number, number, string][] = [
  [120, 630, "#ff7b54"],
  [380, 700, "#ffd166"],
  [560, 660, "#e9f5cd"],
  [760, 730, "#7fd1ff"],
  [960, 680, "#b39cff"],
  [1150, 650, "#ff7b54"],
  [1330, 720, "#ffd166"],
  [1690, 740, "#7fd1ff"],
  [1840, 660, "#b39cff"],
  [260, 380, "#ffd166"],
  [140, 420, "#ff7b54"],
  [1080, 360, "#e9f5cd"],
  [1360, 390, "#7fd1ff"],
  [1750, 350, "#e9f5cd"],
  [620, 400, "#ffd166"],
  [1650, 380, "#7fd1ff"],
];

// [x, y] — small rocks, same distribution idea as FLOWERS.
const ROCKS: [number, number][] = [
  [220, 720],
  [500, 680],
  [840, 750],
  [1080, 700],
  [1260, 660],
  [1600, 720],
  [420, 360],
  [1500, 340],
  [1820, 400],
  [900, 420],
];

function Avatar({
  member,
  crew,
  index,
  selected,
  onSelect,
  dx,
  dy,
}: {
  member: TeamMember;
  crew: CrewId;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  dx: string;
  dy: string;
}) {
  const color = CREW_COLOR[crew];
  const ring = RING_BY_CREW[crew];
  const delay = `${((index * 370) % 1800) / 1000}s`;

  return (
    <button
      type="button"
      onClick={() => onSelect(member.id)}
      aria-pressed={selected}
      title={`${member.name} — view profile`}
      className="transition-transform duration-150 hover:-translate-y-1.5"
      style={{
        position: "relative",
        top: dy,
        left: dx,
        zIndex: 8,
        margin: `0 ${MARGIN_X[crew]}px 0`,
        background: "none",
        border: 0,
        padding: 0,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          position: "relative",
          width: 66,
          height: 66,
          borderRadius: "50%",
          border: `3px solid ${color}`,
          background: "#1b2a20",
          boxShadow: `0 0 0 4px ${ring}, inset 6px 6px 0 rgba(255,209,102,.1)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: 17,
          color,
          animation: `ecBob ${BOB_SECONDS[crew]}s ease-in-out infinite`,
          animationDelay: delay,
        }}
      >
        {member.photoPath ? (
          <Image
            src={member.photoPath}
            alt=""
            fill
            sizes="66px"
            style={{ objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          initials(member.name)
        )}
        {member.linkedinUrl && (
          <span
            style={{
              position: "absolute",
              right: -6,
              top: -4,
              width: 20,
              height: 20,
              background: "#0a66c2",
              border: `2px solid ${ring}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 9,
              color: "#fff",
            }}
          >
            in
          </span>
        )}
      </span>
      <span
        style={{
          padding: "3px 7px",
          background: "rgba(11,19,16,.8)",
          fontFamily: "var(--font-mono)",
          fontWeight: 500,
          fontSize: 10,
          color: "#e9f5cd",
          whiteSpace: "nowrap",
        }}
      >
        {firstName(member.name)}
      </span>
    </button>
  );
}

function AvatarRow({
  crew,
  members,
  selectedId,
  onSelect,
  justify = "center",
  style,
}: {
  crew: CrewId;
  members: TeamMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  justify?: CSSProperties["justifyContent"];
  style?: CSSProperties;
}) {
  const dy = DY_OVERRIDES[crew];
  const dx = DX_OVERRIDES[crew];
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: justify,
        alignItems: "flex-end",
        ...style,
      }}
    >
      {members.map((m, n) => (
        <Avatar
          key={m.id}
          member={m}
          crew={crew}
          index={n}
          selected={selectedId === m.id}
          onSelect={onSelect}
          dy={dy?.[n] ?? "0px"}
          dx={dx?.[n] ?? "0px"}
        />
      ))}
    </div>
  );
}

function Caption({ color, children }: { color: string; children: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        background: "rgba(11,19,16,.82)",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "0.2em",
        color,
      }}
    >
      {children}
    </span>
  );
}

export default function CampScene({
  members,
  selectedId,
  onSelect,
  sun,
}: CampSceneProps) {
  const groups = groupByCrew(members);
  const byId = Object.fromEntries(groups.map((g) => [g.crew.id, g.members]));

  // The first 5 SCENE_DECOR entries are the dusk sky bands; the sun paints
  // over those only, so everything else (mountains, buildings, ground,
  // clusters) sits in front of it instead of the sun floating over them.
  const skyDecor = SCENE_DECOR.slice(0, 5);
  const groundAndAboveDecor = SCENE_DECOR.slice(5);
  // Full-bleed layers (ground/road bands, all left:0+right:0) stretch to the
  // new SCENE_WIDTH on their own. Everything else was hand-placed for the
  // original 1436-wide composition, so its x-position is stretched by
  // DECOR_STRETCH_X to spread it across the wider canvas instead.
  const fullBleedDecor = groundAndAboveDecor.filter((s) => "right" in s);
  const isolatedDecor = groundAndAboveDecor.filter((s) => !("right" in s));

  return (
    <div
      style={{
        position: "relative",
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
        overflow: "hidden",
        background: "#2a3d4f",
      }}
    >
      {skyDecor.map((s, i) => (
        <Dec key={i} {...s} />
      ))}

      {/* Sun — behind the mountains/buildings/ground below, in front of only
          the sky bands above. */}
      <Dec
        left={`${sun.leftPct}%`}
        top={`${sun.topPct}%`}
        width={92}
        height={92}
        background="#ffd98a"
        boxShadow="0 0 0 14px rgba(255,217,138,.16),0 0 0 30px rgba(255,217,138,.07)"
        animation={
          sun.animated
            ? `ecSun ${sun.periodSeconds}s linear infinite`
            : undefined
        }
      />

      {fullBleedDecor.map((s, i) => (
        <Dec key={i} {...s} />
      ))}

      {isolatedDecor.map((s, i) => (
        <Dec
          key={i}
          {...s}
          left={typeof s.left === "number" ? s.left * DECOR_STRETCH_X : s.left}
        />
      ))}

      {FIREFLIES.map(([left, top, color], i) => (
        <Dec
          key={i}
          left={left * DECOR_STRETCH_X}
          top={top}
          width={5}
          height={2}
          background={color}
          boxShadow={`4px -4px 0 0 ${color},8px 0 0 0 ${color}`}
        />
      ))}

      {FLOWERS.map(([x, y, color], i) => (
        <Fragment key={i}>
          <Dec
            left={x + 1}
            top={y}
            width={2}
            height={12}
            background="#2a6440"
          />
          <Dec
            left={x}
            top={y - 10}
            width={4}
            height={4}
            borderRadius="50%"
            background={color}
            boxShadow={`-5px 0 0 0 ${color},5px 0 0 0 ${color},0 -5px 0 0 ${color},0 5px 0 0 ${color},0 0 0 2px rgba(42,31,16,.6)`}
          />
        </Fragment>
      ))}

      {ROCKS.map(([x, y], i) => (
        <Dec
          key={i}
          left={x}
          top={y}
          width={i % 2 === 0 ? 22 : 16}
          height={i % 2 === 0 ? 14 : 10}
          borderRadius="10px 10px 6px 6px"
          background="#5a5f5c"
          boxShadow="inset -3px 3px 0 rgba(255,255,255,.08)"
        />
      ))}

      {/* CO-CHIEF — big tent */}
      <div style={{ position: "absolute", left: 112, top: 356, width: 300 }}>
        <AvatarRow
          crew="co"
          members={byId.co}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <Dec
          left="50%"
          top={26}
          style={{ marginLeft: -116 }}
          zIndex={1}
          width={9}
          height={66}
          background="#6b5533"
        />
        <Dec
          left="50%"
          top={26}
          style={{ marginLeft: 107 }}
          zIndex={1}
          width={9}
          height={66}
          background="#5c4829"
        />
        <Dec
          left="50%"
          top={30}
          zIndex={1}
          width={232}
          height={11}
          background="#8d7145"
          boxShadow="inset 0 3px 0 #a68657,inset 0 -3px 0 #6e5733"
          style={{ transform: "translateX(-50%)" }}
        />
        <Dec
          left="50%"
          top={48}
          zIndex={1}
          width={232}
          height={11}
          background="#846a41"
          boxShadow="inset 0 3px 0 #9d7f52,inset 0 -3px 0 #67512f"
          style={{ transform: "translateX(-50%)" }}
        />
        <Dec
          left="50%"
          top={82}
          zIndex={4}
          width={246}
          height={9}
          background="#9d7f52"
          boxShadow="inset 0 3px 0 #b8965f"
          style={{ transform: "translateX(-50%)" }}
        />
        <Dec
          left="50%"
          top={91}
          zIndex={4}
          width={246}
          height={9}
          background="#8a6f45"
          boxShadow="inset 0 -3px 0 #6b5433"
          style={{ transform: "translateX(-50%)" }}
        />
        <Dec
          left="50%"
          top={100}
          zIndex={4}
          width={250}
          height={6}
          background="#5c4829"
          style={{ transform: "translateX(-50%)" }}
        />
        <Dec
          left="50%"
          top={106}
          style={{ marginLeft: -98 }}
          zIndex={3}
          width={12}
          height={30}
          background="#4a3a26"
          boxShadow="inset 3px 0 0 #63512f"
        />
        <Dec
          left="50%"
          top={106}
          style={{ marginLeft: 86 }}
          zIndex={3}
          width={12}
          height={30}
          background="#42331f"
          boxShadow="inset 3px 0 0 #574427"
        />
        <Dec
          left="50%"
          top={118}
          zIndex={3}
          width={186}
          height={6}
          background="#4a3a26"
          style={{ transform: "translateX(-50%)" }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 9,
            marginTop: 40,
            textAlign: "center",
          }}
        >
          <Caption color="#ffd166">CO-CHIEF</Caption>
        </div>
      </div>

      {/* COMMUNICATIONS — antenna */}
      <div style={{ position: "absolute", left: 490, top: 314, width: 210 }}>
        <AvatarRow
          crew="comms"
          members={byId.comms}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <Dec
          left="50%"
          top={36}
          style={{ marginLeft: 36 }}
          zIndex={4}
          width={40}
          height={28}
          background="#23292b"
          boxShadow="inset 0 3px 0 #3a4246,inset 0 -4px 0 #191e20"
        />
        <Dec
          left="50%"
          top={30}
          style={{ marginLeft: 48 }}
          zIndex={4}
          width={16}
          height={6}
          background="#3a4246"
        />
        <Dec
          left="50%"
          top={43}
          style={{ marginLeft: 22 }}
          zIndex={5}
          width={16}
          height={14}
          background="#2f3538"
        />
        <Dec
          left="50%"
          top={41}
          style={{ marginLeft: 14 }}
          zIndex={5}
          width={9}
          height={18}
          background="#1a1f21"
          boxShadow="inset 0 0 0 2px #6b7a70"
        />
        <Dec
          left="50%"
          top={45}
          style={{ marginLeft: 16 }}
          zIndex={6}
          width={5}
          height={10}
          background="#7fd1ff"
          opacity={0.5}
        />
        <Dec
          left="50%"
          top={31}
          style={{ marginLeft: 68 }}
          zIndex={5}
          width={5}
          height={5}
          background="#ff7b54"
        />
        <Dec
          left="50%"
          top={63}
          style={{ marginLeft: 50 }}
          zIndex={4}
          width={7}
          height={9}
          background="#3a4148"
        />
        <Dec
          left="50%"
          top={70}
          style={{
            marginLeft: 52,
            transform: "rotate(17deg)",
            transformOrigin: "top center",
          }}
          zIndex={3}
          width={4}
          height={44}
          background="#3a4148"
        />
        <Dec
          left="50%"
          top={70}
          style={{
            marginLeft: 52,
            transform: "rotate(-17deg)",
            transformOrigin: "top center",
          }}
          zIndex={3}
          width={4}
          height={44}
          background="#4a545c"
        />
        <Dec
          left="50%"
          top={70}
          style={{ marginLeft: 53 }}
          zIndex={2}
          width={4}
          height={42}
          background="#2f373c"
        />
        <div
          style={{
            position: "relative",
            zIndex: 9,
            marginTop: 46,
            textAlign: "center",
          }}
        >
          <Caption color="#ff7b54">COMMS</Caption>
        </div>
      </div>

      {/* TECH DEV — campfire */}
      <div style={{ position: "absolute", left: 212, top: 556, width: 250 }}>
        <AvatarRow
          crew="tech"
          members={byId.tech}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <Dec
          left={22}
          top={112}
          zIndex={3}
          width={9}
          height={54}
          background="#9aa196"
          style={{ border: "3px solid #3a2c1c", boxSizing: "border-box" }}
        />
        <Dec
          left={80}
          top={126}
          zIndex={3}
          width={9}
          height={52}
          background="#868d83"
          style={{ border: "3px solid #3a2c1c", boxSizing: "border-box" }}
        />
        <Dec
          left={162}
          top={126}
          zIndex={3}
          width={9}
          height={52}
          background="#868d83"
          style={{ border: "3px solid #3a2c1c", boxSizing: "border-box" }}
        />
        <Dec
          left={220}
          top={112}
          zIndex={3}
          width={9}
          height={54}
          background="#9aa196"
          style={{ border: "3px solid #3a2c1c", boxSizing: "border-box" }}
        />
        <Dec
          left="50%"
          top={86}
          zIndex={4}
          width={230}
          height={70}
          borderRadius="50%"
          background="#8a5f2c"
          style={{
            transform: "translateX(-50%)",
            border: "3px solid #3a2c1c",
            boxSizing: "border-box",
          }}
        />
        <Dec
          left="50%"
          top={78}
          zIndex={5}
          width={230}
          height={70}
          borderRadius="50%"
          background="#b9863f"
          style={{
            transform: "translateX(-50%)",
            border: "3px solid #3a2c1c",
            boxSizing: "border-box",
          }}
        />
        <Dec
          left="50%"
          top={88}
          zIndex={6}
          width={180}
          height={50}
          borderRadius="50%"
          background="#243128"
          boxShadow="inset 0 5px 0 rgba(255,217,138,.08),inset 0 -6px 0 rgba(10,16,14,.4)"
          style={{
            transform: "translateX(-50%)",
            border: "3px solid #3a2c1c",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 9,
            marginTop: 76,
            textAlign: "center",
          }}
        >
          <Caption color="#6ee787">TECH DEV</Caption>
        </div>
      </div>

      {/* DAY EVENTS — pennant flag */}
      <div style={{ position: "absolute", left: 1133, top: 326, width: 264 }}>
        <AvatarRow
          crew="day"
          members={byId.day}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <Dec
          left="50%"
          top={94}
          zIndex={5}
          width={224}
          height={12}
          background="#a0763f"
          boxShadow="0 4px 0 0 #7a5a2f"
          style={{ transform: "translateX(-50%) rotate(11deg)" }}
        />
        <Dec
          left="50%"
          top={100}
          zIndex={4}
          width={0}
          height={0}
          style={{
            transform: "translateX(-50%)",
            borderLeft: "16px solid transparent",
            borderRight: "16px solid transparent",
            borderBottom: "30px solid #6a5636",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 9,
            marginTop: 52,
            textAlign: "center",
          }}
        >
          <Caption color="#7fd1ff">DAY EVENTS</Caption>
        </div>
      </div>

      {/* NIGHT EVENTS — lantern string */}
      <div style={{ position: "absolute", left: 1481, top: 336, width: 240 }}>
        <Dec
          left={14}
          top={4}
          zIndex={1}
          width={8}
          height={126}
          background="#5a4327"
          style={{ transform: "rotate(7deg)" }}
        />
        <Dec
          right={14}
          top={4}
          zIndex={1}
          width={8}
          height={126}
          background="#5a4327"
          style={{ transform: "rotate(-7deg)" }}
        />
        <Dec
          left={8}
          right={8}
          top={2}
          zIndex={1}
          height={9}
          background="#6b5130"
        />
        <Dec
          left="50%"
          top={10}
          zIndex={1}
          width={3}
          height={78}
          background="#8e9aa0"
          boxShadow="113px 0 0 0 #8e9aa0"
          style={{ marginLeft: -58 }}
        />
        <AvatarRow
          crew="night"
          members={byId.night}
          selectedId={selectedId}
          onSelect={onSelect}
          style={{ paddingTop: 16 }}
        />
        <Dec
          left="50%"
          top={88}
          zIndex={4}
          width={48}
          height={10}
          background="#3a4148"
          boxShadow="112px 0 0 0 #3a4148"
          style={{ marginLeft: -80 }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 9,
            marginTop: 38,
            textAlign: "center",
          }}
        >
          <Caption color="#b39cff">NIGHT EVENTS</Caption>
        </div>
      </div>

      {/* GENERAL — s'mores sticks over the fire ring, x3 */}
      <div style={{ position: "absolute", left: 758, top: 436, width: 340 }}>
        {[0, 100, 200].map((off) => (
          <div key={off}>
            <Dec
              left={24 + off}
              top={70}
              zIndex={4}
              width={44}
              height={44}
              borderRadius="50%"
              style={{
                border: "4px solid #39424a",
                boxSizing: "border-box",
                boxShadow: "inset 0 0 0 2px rgba(233,245,205,.14)",
              }}
            />
            <Dec
              left={72 + off}
              top={70}
              zIndex={4}
              width={44}
              height={44}
              borderRadius="50%"
              style={{
                border: "4px solid #39424a",
                boxSizing: "border-box",
                boxShadow: "inset 0 0 0 2px rgba(233,245,205,.14)",
              }}
            />
            <Dec
              left={43 + off}
              top={90}
              zIndex={5}
              width={5}
              height={5}
              borderRadius="50%"
              background="#8a948b"
              boxShadow="48px 0 0 0 #8a948b"
            />
            <Dec
              left={46 + off}
              top={92}
              zIndex={5}
              width={24}
              height={4}
              background="#c68f45"
              style={{
                transform: "rotate(0deg)",
                transformOrigin: "left center",
              }}
            />
            <Dec
              left={70 + off}
              top={92}
              zIndex={5}
              width={33}
              height={4}
              background="#c68f45"
              style={{
                transform: "rotate(-112deg)",
                transformOrigin: "left center",
              }}
            />
            <Dec
              left={70 + off}
              top={92}
              zIndex={5}
              width={36}
              height={5}
              background="#d69a4c"
              style={{
                transform: "rotate(-56deg)",
                transformOrigin: "left center",
              }}
            />
            <Dec
              left={58 + off}
              top={62}
              zIndex={5}
              width={32}
              height={4}
              background="#d69a4c"
              style={{
                transform: "rotate(0deg)",
                transformOrigin: "left center",
              }}
            />
            <Dec
              left={58 + off}
              top={64}
              zIndex={5}
              width={32}
              height={4}
              background="#b9863f"
              style={{
                transform: "rotate(112deg)",
                transformOrigin: "left center",
              }}
            />
            <Dec
              left={90 + off}
              top={64}
              zIndex={5}
              width={31}
              height={4}
              background="#b9863f"
              style={{
                transform: "rotate(82deg)",
                transformOrigin: "left center",
              }}
            />
            <Dec
              left={64 + off}
              top={87}
              zIndex={6}
              width={12}
              height={12}
              borderRadius="50%"
              style={{ border: "2px solid #8a7550", boxSizing: "border-box" }}
            />
            <Dec
              left={69 + off}
              top={91}
              zIndex={6}
              width={13}
              height={3}
              background="#8a7550"
              style={{ transform: "rotate(28deg)" }}
            />
            <Dec
              left={46 + off}
              top={55}
              zIndex={6}
              width={24}
              height={6}
              borderRadius={3}
              background="#2f373c"
            />
            <Dec
              left={80 + off}
              top={54}
              zIndex={6}
              width={26}
              height={4}
              borderRadius={2}
              background="#2f373c"
            />
            <Dec
              left={78 + off}
              top={52}
              zIndex={6}
              width={6}
              height={8}
              borderRadius={2}
              background="#1f2529"
              boxShadow="26px 0 0 0 #1f2529"
            />
          </div>
        ))}
        <AvatarRow
          crew="gen"
          members={byId.gen}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <div
          style={{
            position: "relative",
            zIndex: 9,
            marginTop: 40,
            textAlign: "center",
          }}
        >
          <Caption color="#e9f5cd">GENERAL</Caption>
        </div>
      </div>

      {/* INC & SUS & EQ — clothesline + recycling bin */}
      <div style={{ position: "absolute", left: 1424, top: 596, width: 210 }}>
        <AvatarRow
          crew="ise"
          members={byId.ise}
          selectedId={selectedId}
          onSelect={onSelect}
          justify="flex-start"
          style={{ paddingLeft: 14 }}
        />
        <Dec
          left={16}
          top={76}
          zIndex={5}
          width={72}
          height={38}
          borderRadius="26px 22px 12px 14px"
          background="#6f7a72"
          boxShadow="inset 0 5px 0 #8a948b,inset -8px -10px 0 rgba(31,42,34,.28)"
        />
        <Dec
          left={56}
          top={60}
          zIndex={6}
          width={132}
          height={4}
          background="#8a7550"
          style={{
            transform: "rotate(-26deg)",
            transformOrigin: "left center",
          }}
        />
        <Dec
          left={70}
          top={52}
          zIndex={7}
          width={8}
          height={12}
          background="#3a4148"
          borderRadius="0 0 4px 4px"
        />
        <Dec
          left={177}
          top={2}
          zIndex={6}
          width={1}
          height={62}
          background="rgba(233,245,205,.5)"
          style={{
            transform: "rotate(-3deg)",
            transformOrigin: "top center",
          }}
        />
        <Dec
          left={176}
          top={63}
          zIndex={7}
          width={11}
          height={11}
          borderRadius="50%"
          background="#f2f4ea"
          boxShadow="inset 0 5px 0 #d94f3d"
        />
        <div
          style={{
            position: "relative",
            zIndex: 9,
            marginTop: 36,
            textAlign: "center",
          }}
        >
          <Caption color="#58d6a8">INC & SUS & EQ</Caption>
        </div>
      </div>
    </div>
  );
}
