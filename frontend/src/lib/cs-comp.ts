// CS comp — in-house CSS battle. Teams of 5 recreate a target scene (blocks
// of absolutely-positioned <i> tags) in a single HTML+CSS file, one part per
// teammate. TEAMS/LEVELS are fake local data standing in for the backend
// (teams, challenges and submissions all still need real endpoints) — kept
// here as pure, client-importable data + logic, mirroring the team.ts
// precedent for local fixtures.

// [x, y, w, h, color, radius?, extraCss?] — left/top/width/height in px,
// background color ("transparent" omits it), border-radius (number => px,
// string used verbatim), and any extra raw CSS declarations.
export type Rect = [
  number,
  number,
  number,
  number,
  string,
  (number | string | null)?,
  string?,
];

export interface Part {
  title: string;
  rects: Rect[];
}

export interface Level {
  n: number;
  name: string;
  color: string;
  bg: string;
  note: string;
  parts: Part[];
}

export interface CompMember {
  name: string;
  initials: string;
  program: string;
}

export interface CompTeam {
  id: string;
  name: string;
  color: string;
  members: CompMember[];
}

export const TEAM_SIZE = 5;
export const COMP_MINUTES = 45;

export const TEAMS: CompTeam[] = [
  {
    id: "t1",
    name: "NULL POINTERS",
    color: "#6ee787",
    members: [
      { name: "Ines Ferreira", initials: "IF", program: "U4 Software" },
      { name: "Wen Zhao", initials: "WZ", program: "U3 Computer Eng" },
      { name: "Koffi Mensah", initials: "KM", program: "U2 Electrical Eng" },
    ],
  },
  {
    id: "t2",
    name: "FLEXBOX FIVE",
    color: "#7fd1ff",
    members: [
      { name: "Priya Raman", initials: "PR", program: "U4 Computer Eng" },
      { name: "Marc Tremblay", initials: "MT", program: "U3 Software" },
      { name: "Noor Haddad", initials: "NH", program: "U1 Electrical Eng" },
      { name: "Elise Gagnon", initials: "EG", program: "U2 Software" },
    ],
  },
  {
    id: "t3",
    name: "SPECIFICITY WARS",
    color: "#ffd166",
    members: [
      { name: "Maya Okafor", initials: "MO", program: "U4 Electrical Eng" },
      { name: "Sam Whitford", initials: "SW", program: "U0 Electrical Eng" },
    ],
  },
  {
    id: "t4",
    name: "DIV SOUP",
    color: "#c792ea",
    members: [
      { name: "Ana Silva", initials: "AS", program: "U3 Computer Eng" },
      { name: "Ravi Menon", initials: "RM", program: "U2 Software" },
      { name: "Théo Blais", initials: "TB", program: "U1 Software" },
      { name: "Jun Park", initials: "JP", program: "U4 Electrical Eng" },
      { name: "Dana Kovač", initials: "DK", program: "U0 Computer Eng" },
    ],
  },
  {
    id: "t5",
    name: "GOLDEN RATIO",
    color: "#ff7b54",
    members: [
      { name: "Leila Amrani", initials: "LA", program: "U4 Software" },
      { name: "Owen Clarke", initials: "OC", program: "U3 Electrical Eng" },
      { name: "Mei Tanaka", initials: "MT", program: "U1 Computer Eng" },
    ],
  },
  {
    id: "t6",
    name: "CASCADE CREW",
    color: "#58d6a8",
    members: [
      { name: "Hugo Lemieux", initials: "HL", program: "U2 Computer Eng" },
    ],
  },
];

export const LEVELS: Level[] = [
  {
    n: 1,
    name: "WARM UP",
    color: "#6ee787",
    bg: "#2a3d4f",
    note: "Flat blocks only — position, size, colour.",
    parts: [
      {
        title: "Horizon",
        rects: [
          [0, 130, 300, 70, "#2c5e40"],
          [0, 120, 300, 10, "#d99a5b"],
          [130, 70, 50, 50, "#ffd98a"],
        ],
      },
      {
        title: "Goalposts",
        rects: [
          [0, 150, 300, 50, "#2c5e40"],
          [64, 56, 10, 94, "#e9f5cd"],
          [226, 56, 10, 94, "#e9f5cd"],
          [64, 56, 172, 10, "#e9f5cd"],
        ],
      },
      {
        title: "Scoreboard",
        rects: [
          [40, 44, 220, 112, "#0b1310"],
          [56, 60, 80, 24, "#6ee787"],
          [56, 96, 120, 16, "#3f8f57"],
          [56, 120, 60, 12, "#2c5e40"],
        ],
      },
      {
        title: "Cinder track",
        rects: [
          [0, 120, 300, 80, "#8a5a3c"],
          [0, 148, 300, 5, "#e9f5cd"],
          [0, 176, 300, 5, "#e9f5cd"],
        ],
      },
      {
        title: "Team flag",
        rects: [
          [0, 180, 300, 20, "#2c5e40"],
          [40, 40, 10, 140, "#9aa196"],
          [50, 44, 90, 50, "#6ee787"],
          [50, 64, 90, 8, "#0b1310"],
        ],
      },
    ],
  },
  {
    n: 2,
    name: "FIELD DAY",
    color: "#4cc9f0",
    bg: "#1b2a20",
    note: "Five or six blocks — stacking and border-radius.",
    parts: [
      {
        title: "Podium",
        rects: [
          [0, 190, 300, 10, "#2c5e40"],
          [100, 110, 100, 90, "#e9f5cd"],
          [40, 140, 60, 60, "#9aa196"],
          [200, 150, 60, 50, "#7d857a"],
          [140, 80, 20, 20, "#ffd166", 10],
        ],
      },
      {
        title: "Camp tent",
        rects: [
          [0, 180, 300, 20, "#2c5e40"],
          [70, 100, 160, 80, "#ff7b54"],
          [130, 132, 40, 48, "#1b2a20", "4px 4px 0 0"],
          [148, 58, 4, 44, "#9aa196"],
          [152, 58, 38, 18, "#ffd166"],
        ],
      },
      {
        title: "Bonfire",
        rects: [
          [0, 180, 300, 20, "#2c5e40"],
          [96, 168, 108, 12, "#5a4632", 6],
          [96, 158, 108, 10, "#3f2e1e", 5, "transform:rotate(-8deg)"],
          [
            128,
            104,
            44,
            64,
            "#ff7b54",
            null,
            "border-radius:22px 22px 6px 6px",
          ],
          [
            140,
            124,
            20,
            44,
            "#ffd166",
            null,
            "border-radius:10px 10px 4px 4px",
          ],
        ],
      },
      {
        title: "Bench and tree",
        rects: [
          [0, 180, 300, 20, "#2c5e40"],
          [40, 120, 120, 12, "#8a5a3c"],
          [46, 132, 12, 48, "#5f6b5c"],
          [142, 132, 12, 48, "#5f6b5c"],
          [220, 120, 14, 60, "#4a3a26"],
          [196, 70, 62, 58, "#235838", 26],
        ],
      },
      {
        title: "Match ball",
        rects: [
          [0, 150, 300, 50, "#2c5e40"],
          [118, 148, 64, 10, "rgba(0,0,0,.35)", "50%"],
          [120, 88, 60, 60, "#e9f5cd", 30],
          [140, 108, 20, 20, "#0b1310", 4, "transform:rotate(45deg)"],
          [126, 94, 14, 14, "#0b1310", 3],
        ],
      },
    ],
  },
  {
    n: 3,
    name: "GOLDEN HOUR",
    color: "#ffd166",
    bg: "#142a33",
    note: "Seven blocks — clip-path triangles and rotation.",
    parts: [
      {
        title: "Sailboat",
        rects: [
          [0, 140, 300, 60, "#2f6f8f"],
          [40, 36, 36, 36, "#ffd98a", 18],
          [100, 124, 100, 20, "#8a5a3c", "0 0 20px 20px"],
          [148, 54, 4, 72, "#e9f5cd"],
          [
            104,
            58,
            44,
            66,
            "#e9f5cd",
            null,
            "clip-path:polygon(100% 0,100% 100%,0 100%)",
          ],
          [
            152,
            58,
            44,
            66,
            "#ffd98a",
            null,
            "clip-path:polygon(0 0,100% 100%,0 100%)",
          ],
          [0, 152, 300, 4, "rgba(233,245,205,.35)"],
        ],
      },
      {
        title: "Ice cream",
        rects: [
          [104, 178, 92, 10, "#9aa196", 5],
          [
            130,
            120,
            40,
            60,
            "#c98a4b",
            null,
            "clip-path:polygon(0 0,100% 0,50% 100%)",
          ],
          [128, 90, 44, 44, "#ff7b54", 22],
          [136, 66, 28, 28, "#e9f5cd", 14],
          [144, 52, 12, 12, "#c1121f", 6],
          [150, 44, 3, 10, "#3f8f57"],
          [132, 112, 36, 8, "rgba(0,0,0,.18)", 4],
        ],
      },
      {
        title: "Windmill",
        rects: [
          [0, 168, 300, 32, "#2c5e40"],
          [136, 90, 28, 80, "#e9f5cd", "4px 4px 0 0"],
          [142, 110, 16, 20, "#4a3a26", 2],
          [148, 44, 4, 46, "#5a4632", null, "transform-origin:50% 100%"],
          [
            148,
            44,
            4,
            46,
            "#5a4632",
            null,
            "transform:rotate(90deg);transform-origin:50% 100%",
          ],
          [
            148,
            44,
            4,
            46,
            "#5a4632",
            null,
            "transform:rotate(45deg);transform-origin:50% 100%",
          ],
          [
            148,
            44,
            4,
            46,
            "#5a4632",
            null,
            "transform:rotate(-45deg);transform-origin:50% 100%",
          ],
          [144, 84, 12, 12, "#0b1310", 6],
        ],
      },
      {
        title: "Letter home",
        rects: [
          [70, 70, 160, 100, "#e9f5cd", 4],
          [70, 166, 160, 6, "rgba(0,0,0,.3)"],
          [
            70,
            70,
            160,
            58,
            "#c6d6c0",
            null,
            "clip-path:polygon(0 0,100% 0,50% 100%)",
          ],
          [196, 78, 22, 26, "#ff7b54", 2],
          [86, 138, 80, 6, "#9aa196"],
          [86, 150, 50, 6, "#9aa196"],
          [200, 140, 18, 18, "#3f8f57", 9],
        ],
      },
      {
        title: "Balloon ride",
        rects: [
          [0, 170, 300, 30, "#2c5e40"],
          [40, 58, 54, 16, "#e9f5cd", 8],
          [118, 40, 64, 76, "#ff7b54", "50% 50% 45% 45%"],
          [146, 40, 8, 76, "#ffd166"],
          [138, 124, 24, 18, "#8a5a3c", 3],
          [128, 114, 3, 12, "#5a4632", null, "transform:rotate(18deg)"],
          [169, 114, 3, 12, "#5a4632", null, "transform:rotate(-18deg)"],
        ],
      },
    ],
  },
  {
    n: 4,
    name: "SCUNTS",
    color: "#c792ea",
    bg: "#0f1512",
    note: "Nine or ten blocks — borders, overlap, transforms.",
    parts: [
      {
        title: "Bicycle",
        rects: [
          [0, 176, 300, 24, "#1d3a2f"],
          [40, 110, 60, 60, "transparent", 30, "border:6px solid #e9f5cd"],
          [200, 110, 60, 60, "transparent", 30, "border:6px solid #e9f5cd"],
          [76, 136, 150, 5, "#6ee787"],
          [92, 100, 4, 42, "#6ee787", null, "transform:rotate(18deg)"],
          [150, 100, 4, 42, "#6ee787", null, "transform:rotate(-14deg)"],
          [112, 96, 34, 5, "#6ee787", null, "transform:rotate(-10deg)"],
          [104, 88, 26, 7, "#e9f5cd", 3],
          [196, 92, 20, 5, "#e9f5cd", 2],
          [204, 96, 4, 20, "#9aa196"],
        ],
      },
      {
        title: "Cat",
        rects: [
          [0, 176, 300, 24, "#1d3a2f"],
          [
            96,
            44,
            34,
            34,
            "#9aa196",
            null,
            "clip-path:polygon(0 100%,100% 100%,25% 0)",
          ],
          [
            170,
            44,
            34,
            34,
            "#9aa196",
            null,
            "clip-path:polygon(0 100%,100% 100%,75% 0)",
          ],
          [100, 60, 100, 90, "#9aa196", "50% 50% 46% 46%"],
          [124, 94, 14, 20, "#0b1310", 7],
          [162, 94, 14, 20, "#0b1310", 7],
          [143, 120, 14, 10, "#ff7b54", "50%"],
          [60, 122, 40, 3, "#e9f5cd"],
          [200, 122, 40, 3, "#e9f5cd"],
          [130, 132, 40, 4, "#0b1310", 2],
        ],
      },
      {
        title: "Arcade cabinet",
        rects: [
          [96, 180, 108, 8, "rgba(0,0,0,.45)"],
          [90, 30, 120, 150, "#1a2c22", 6],
          [104, 34, 92, 10, "#6ee787"],
          [104, 50, 92, 58, "#0b1310", 2],
          [112, 58, 76, 42, "#4cc9f0", 2],
          [104, 116, 92, 22, "#243c2e", 3],
          [118, 120, 16, 16, "#ffd166", 8],
          [142, 120, 16, 16, "#ff7b54", 8],
          [172, 112, 6, 22, "#e9f5cd", 3],
          [168, 106, 14, 8, "#c1121f", 4],
        ],
      },
      {
        title: "Rocket",
        rects: [
          [96, 182, 108, 8, "#5f6b5c"],
          [134, 38, 32, 20, "#ff7b54", "16px 16px 0 0"],
          [134, 56, 32, 80, "#e9f5cd", "4px 4px 4px 4px"],
          [142, 72, 16, 16, "#4cc9f0", 8],
          [
            118,
            110,
            18,
            26,
            "#ff7b54",
            null,
            "clip-path:polygon(100% 0,100% 100%,0 100%)",
          ],
          [
            164,
            110,
            18,
            26,
            "#ff7b54",
            null,
            "clip-path:polygon(0 0,100% 100%,0 100%)",
          ],
          [140, 136, 20, 34, "#ffd166", "6px 6px 12px 12px"],
          [145, 142, 10, 20, "#ff7b54", "4px 4px 8px 8px"],
          [110, 168, 42, 14, "rgba(233,245,205,.45)", 8],
          [158, 172, 36, 12, "rgba(233,245,205,.3)", 7],
        ],
      },
      {
        title: "Robot mascot",
        rects: [
          [0, 176, 300, 24, "#1d3a2f"],
          [143, 22, 14, 14, "#ff7b54", 7],
          [148, 32, 4, 14, "#e9f5cd"],
          [110, 44, 80, 62, "#9aa196", 6],
          [126, 64, 16, 16, "#4cc9f0", 8],
          [158, 64, 16, 16, "#4cc9f0", 8],
          [130, 88, 40, 6, "#0b1310", 3],
          [104, 110, 92, 60, "#7d857a", 6],
          [86, 118, 18, 42, "#9aa196", 4],
          [196, 118, 18, 42, "#9aa196", 4],
          [128, 124, 44, 20, "#243c2e", 3],
        ],
      },
    ],
  },
  {
    n: 5,
    name: "FINAL BOSS",
    color: "#ff7b54",
    bg: "#0b1310",
    note: "Eleven blocks and up — full scenes, shadows, layering.",
    parts: [
      {
        title: "The quad at golden hour",
        rects: [
          [0, 0, 300, 96, "#2a3d4f"],
          [0, 96, 300, 10, "#d99a5b"],
          [0, 106, 300, 94, "#2c5e40"],
          [
            200,
            36,
            44,
            44,
            "#ffd98a",
            22,
            "box-shadow:0 0 0 10px rgba(255,217,138,.18)",
          ],
          [0, 116, 300, 20, "#8a5a3c"],
          [50, 98, 10, 42, "#4a3a26"],
          [32, 64, 46, 42, "#235838", 20],
          [180, 124, 60, 8, "#8a5a3c"],
          [186, 132, 8, 16, "#5f6b5c"],
          [232, 132, 8, 16, "#5f6b5c"],
          [86, 152, 86, 28, "#4cc9f0", "50%"],
          [96, 158, 30, 6, "rgba(233,245,205,.4)", 3],
        ],
      },
      {
        title: "Night skyline",
        rects: [
          [0, 150, 300, 50, "#101a15"],
          [236, 28, 34, 34, "#e9f5cd", 17],
          [20, 80, 54, 70, "#182633"],
          [84, 52, 62, 98, "#14212c"],
          [156, 96, 54, 54, "#182633"],
          [220, 70, 52, 80, "#14212c"],
          [32, 94, 10, 14, "#ffd166"],
          [52, 94, 10, 14, "rgba(255,209,102,.45)"],
          [98, 70, 10, 14, "#ffd166"],
          [120, 70, 10, 14, "rgba(255,209,102,.5)"],
          [168, 112, 10, 14, "#ffd166"],
          [236, 88, 10, 14, "#ffd166"],
        ],
      },
      {
        title: "Ferris wheel",
        rects: [
          [0, 168, 300, 32, "#1d3a2f"],
          [76, 44, 148, 148, "transparent", 74, "border:5px solid #6ee787"],
          [144, 110, 12, 12, "#e9f5cd", 6],
          [148, 48, 4, 64, "#3f8f57", null, "transform-origin:50% 100%"],
          [
            148,
            48,
            4,
            64,
            "#3f8f57",
            null,
            "transform:rotate(90deg);transform-origin:50% 100%",
          ],
          [
            148,
            48,
            4,
            64,
            "#3f8f57",
            null,
            "transform:rotate(45deg);transform-origin:50% 100%",
          ],
          [
            148,
            48,
            4,
            64,
            "#3f8f57",
            null,
            "transform:rotate(-45deg);transform-origin:50% 100%",
          ],
          [138, 36, 24, 18, "#ffd166", 3],
          [204, 102, 24, 18, "#ff7b54", 3],
          [72, 102, 24, 18, "#4cc9f0", 3],
          [138, 168, 24, 18, "#c792ea", 3],
          [130, 150, 8, 26, "#5f6b5c", null, "transform:rotate(14deg)"],
          [162, 150, 8, 26, "#5f6b5c", null, "transform:rotate(-14deg)"],
        ],
      },
      {
        title: "Terminal",
        rects: [
          [
            36,
            32,
            228,
            136,
            "#0d1712",
            4,
            "box-shadow:0 8px 0 rgba(0,0,0,.35)",
          ],
          [36, 32, 228, 18, "#1a2c22", "4px 4px 0 0"],
          [48, 37, 8, 8, "#ff7b54", 4],
          [62, 37, 8, 8, "#ffd166", 4],
          [76, 37, 8, 8, "#6ee787", 4],
          [52, 64, 14, 8, "#3f8f57"],
          [72, 64, 110, 8, "#6ee787"],
          [52, 82, 14, 8, "#3f8f57"],
          [72, 82, 74, 8, "#c6d6c0"],
          [52, 100, 14, 8, "#3f8f57"],
          [72, 100, 138, 8, "#4cc9f0"],
          [52, 118, 14, 8, "#3f8f57"],
          [72, 118, 10, 8, "#e9f5cd", "0"],
        ],
      },
      {
        title: "Boss",
        rects: [
          [46, 44, 208, 112, "#6ee787", 8],
          [54, 52, 192, 96, "#0b1310", 5],
          [76, 72, 44, 44, "#ff7b54", 22],
          [180, 72, 44, 44, "#ff7b54", 22],
          [88, 84, 18, 18, "#0b1310", 9],
          [192, 84, 18, 18, "#0b1310", 9],
          [70, 60, 44, 8, "#e9f5cd", 4, "transform:rotate(-12deg)"],
          [186, 60, 44, 8, "#e9f5cd", 4, "transform:rotate(12deg)"],
          [96, 124, 108, 16, "#e9f5cd", 4],
          [116, 124, 10, 16, "#0b1310"],
          [146, 124, 10, 16, "#0b1310"],
          [176, 124, 10, 16, "#0b1310"],
          [0, 180, 300, 20, "#093325"],
        ],
      },
    ],
  },
  {
    n: 6,
    name: "THE LANDSCAPE",
    color: "#58d6a8",
    bg: "#233b52",
    note: "One whole scene, fifteen blocks and up. No shortcuts.",
    parts: [
      {
        title: "Mount Royal at dawn",
        rects: [
          [0, 0, 300, 64, "#3c4a5e"],
          [0, 64, 300, 36, "#6b5560"],
          [0, 100, 300, 20, "#a3695a"],
          [
            130,
            72,
            40,
            40,
            "#ffd98a",
            20,
            "box-shadow:0 0 0 9px rgba(255,217,138,.16)",
          ],
          [
            16,
            38,
            150,
            92,
            "#2c3e4f",
            null,
            "clip-path:polygon(50% 0,100% 100%,0 100%)",
          ],
          [
            132,
            52,
            140,
            78,
            "#26364a",
            null,
            "clip-path:polygon(50% 0,100% 100%,0 100%)",
          ],
          [
            74,
            40,
            36,
            26,
            "#e9f5cd",
            null,
            "clip-path:polygon(50% 0,100% 100%,0 100%)",
          ],
          [
            0,
            118,
            300,
            30,
            "#1d3a2f",
            null,
            "clip-path:polygon(0 45%,18% 5%,40% 50%,62% 12%,84% 55%,100% 25%,100% 100%,0 100%)",
          ],
          [0, 146, 300, 36, "#2f6f8f"],
          [40, 152, 120, 4, "rgba(233,245,205,.5)"],
          [92, 164, 86, 3, "rgba(233,245,205,.28)"],
          [0, 180, 300, 20, "#2c5e40"],
          [40, 156, 6, 26, "#4a3a26"],
          [
            28,
            128,
            30,
            32,
            "#235838",
            null,
            "clip-path:polygon(50% 0,100% 100%,0 100%)",
          ],
          [252, 158, 6, 24, "#4a3a26"],
          [
            242,
            134,
            26,
            28,
            "#235838",
            null,
            "clip-path:polygon(50% 0,100% 100%,0 100%)",
          ],
          [186, 46, 7, 2, "#e9f5cd"],
        ],
      },
      {
        title: "Lakeside dusk",
        rects: [
          [0, 0, 300, 70, "#2a3d4f"],
          [0, 70, 300, 26, "#7a5a68"],
          [0, 96, 300, 18, "#c2705a"],
          [196, 80, 34, 34, "#ffd98a", 17],
          [
            0,
            104,
            300,
            20,
            "#16261f",
            null,
            "clip-path:polygon(0 60%,14% 20%,32% 62%,52% 15%,72% 58%,88% 25%,100% 55%,100% 100%,0 100%)",
          ],
          [0, 122, 300, 58, "#245a72"],
          [0, 122, 300, 4, "rgba(255,217,138,.35)"],
          [150, 132, 120, 4, "rgba(255,217,138,.4)"],
          [168, 146, 86, 3, "rgba(255,217,138,.25)"],
          [0, 178, 300, 22, "#1d3a2f"],
          [40, 140, 110, 8, "#5a4632"],
          [40, 148, 8, 32, "#4a3a26"],
          [142, 148, 8, 32, "#4a3a26"],
          [180, 150, 60, 12, "#8a5a3c", "0 0 14px 14px"],
          [196, 144, 8, 8, "#e9f5cd", 4],
          [214, 144, 26, 4, "#5a4632", null, "transform:rotate(-8deg)"],
          [60, 60, 44, 12, "#8fa3ae", 6],
        ],
      },
      {
        title: "Winter campus",
        rects: [
          [0, 0, 300, 110, "#2c4763"],
          [240, 24, 30, 30, "#e9f5cd", 15],
          [0, 110, 300, 90, "#dfe9ea"],
          [24, 58, 64, 54, "#1e2f3f", "3px 3px 0 0"],
          [36, 70, 14, 16, "#ffd166"],
          [62, 70, 14, 16, "rgba(255,209,102,.5)"],
          [36, 94, 14, 16, "rgba(255,209,102,.6)"],
          [104, 40, 80, 72, "#182633", "4px 4px 0 0"],
          [118, 52, 18, 20, "#ffd166"],
          [148, 52, 18, 20, "rgba(255,209,102,.45)"],
          [118, 82, 18, 20, "rgba(255,209,102,.55)"],
          [148, 82, 18, 20, "#ffd166"],
          [200, 66, 58, 46, "#1e2f3f", "3px 3px 0 0"],
          [212, 78, 16, 18, "#ffd166"],
          [24, 108, 64, 8, "#f4fbfb", "4px 4px 0 0"],
          [104, 36, 80, 8, "#f4fbfb", "4px 4px 0 0"],
          [200, 62, 58, 8, "#f4fbfb", "4px 4px 0 0"],
          [92, 120, 6, 42, "#3f2e1e"],
          [
            80,
            96,
            30,
            30,
            "#1f5138",
            null,
            "clip-path:polygon(50% 0,100% 100%,0 100%)",
          ],
          [
            84,
            116,
            22,
            22,
            "#2a6b47",
            null,
            "clip-path:polygon(50% 0,100% 100%,0 100%)",
          ],
          [268, 124, 5, 36, "#3f2e1e"],
          [
            258,
            104,
            26,
            26,
            "#1f5138",
            null,
            "clip-path:polygon(50% 0,100% 100%,0 100%)",
          ],
          [0, 168, 300, 6, "rgba(255,255,255,.55)"],
        ],
      },
      {
        title: "River valley",
        rects: [
          [0, 0, 300, 52, "#4a6c8c"],
          [0, 52, 300, 18, "#8fa3ae"],
          [36, 16, 40, 40, "#ffd98a", 20],
          [
            0,
            64,
            160,
            52,
            "#3f6b4a",
            null,
            "clip-path:polygon(0 100%,0 40%,40% 0,100% 60%,100% 100%)",
          ],
          [
            140,
            60,
            160,
            58,
            "#356043",
            null,
            "clip-path:polygon(0 60%,55% 0,100% 45%,100% 100%,0 100%)",
          ],
          [
            0,
            110,
            300,
            90,
            "#2f6f8f",
            null,
            "clip-path:polygon(38% 0,60% 0,100% 100%,0 100%)",
          ],
          [
            0,
            110,
            300,
            90,
            "#2c5e40",
            null,
            "clip-path:polygon(0 0,38% 0,0 100%)",
          ],
          [
            0,
            110,
            300,
            90,
            "#357d43",
            null,
            "clip-path:polygon(60% 0,100% 0,100% 100%)",
          ],
          [104, 132, 26, 3, "rgba(233,245,205,.45)"],
          [92, 158, 44, 3, "rgba(233,245,205,.35)"],
          [80, 182, 60, 3, "rgba(233,245,205,.25)"],
          [30, 120, 6, 20, "#4a3a26"],
          [20, 102, 26, 24, "#235838", 13],
          [236, 124, 6, 22, "#4a3a26"],
          [226, 104, 26, 26, "#235838", 13],
          [186, 80, 44, 10, "#9aa196", 2],
          [196, 90, 6, 14, "#5f6b5c"],
          [214, 90, 6, 14, "#5f6b5c"],
        ],
      },
      {
        title: "Desert highway",
        rects: [
          [0, 0, 300, 96, "#e2955f"],
          [0, 0, 300, 44, "#c2705a"],
          [
            124,
            52,
            52,
            52,
            "#ffe0a3",
            26,
            "box-shadow:0 0 0 12px rgba(255,224,163,.2)",
          ],
          [
            0,
            88,
            110,
            28,
            "#8a5a4c",
            null,
            "clip-path:polygon(0 100%,16% 20%,42% 24%,58% 0,80% 30%,100% 100%)",
          ],
          [
            190,
            84,
            110,
            32,
            "#7d5044",
            null,
            "clip-path:polygon(0 100%,22% 26%,48% 8%,70% 30%,100% 100%)",
          ],
          [0, 112, 300, 88, "#caa06e"],
          [
            0,
            112,
            300,
            88,
            "#3a3a3e",
            null,
            "clip-path:polygon(44% 0,56% 0,84% 100%,16% 100%)",
          ],
          [148, 118, 4, 14, "#f4fbfb"],
          [147, 142, 6, 18, "#f4fbfb"],
          [146, 172, 8, 24, "#f4fbfb"],
          [56, 120, 10, 44, "#2f6b45", 6],
          [46, 132, 10, 20, "#2f6b45", 5],
          [66, 126, 10, 22, "#2f6b45", 5],
          [240, 126, 12, 50, "#2f6b45", 6],
          [228, 140, 12, 22, "#2f6b45", 6],
          [252, 134, 12, 24, "#2f6b45", 6],
          [96, 104, 4, 26, "#5f6b5c"],
          [88, 96, 20, 10, "#9aa196", 2],
        ],
      },
    ],
  },
];

export const TOTAL_PARTS = LEVELS.reduce((n, l) => n + l.parts.length, 0);

export function partKey(level: number, part: number): string {
  return `${level}-${part}`;
}

export function rectCss(r: Rect, pretty: boolean): string {
  let s = `left: ${r[0]}px; top: ${r[1]}px; width: ${r[2]}px; height: ${r[3]}px`;
  if (r[4] && r[4] !== "transparent") s += `; background: ${r[4]}`;
  if (r[5] !== undefined && r[5] !== null && r[5] !== "") {
    s += `; border-radius: ${typeof r[5] === "number" ? `${r[5]}px` : r[5]}`;
  }
  if (r[6]) s += `; ${r[6]}`;
  return pretty ? s : s.replace(/;\s+/g, ";").replace(/:\s+/g, ":");
}

function shape(r: Rect, pretty: boolean): string {
  return `<i style="${rectCss(r, pretty)}"></i>`;
}

export function targetDoc(lv: Level, pt: Part): string {
  return (
    `<style>body{margin:0;background:${lv.bg}}i{position:absolute;display:block}</style>` +
    pt.rects.map((r) => shape(r, false)).join("")
  );
}

// Levels 1-2 hand over one shape to start from; levels 3+ (more shapes, more
// techniques) hand over two, so the challenge always has a body of work left
// no matter how few or many shapes the full scene needs.
export function starterCode(lv: Level, pt: Part): string {
  const given = lv.n >= 3 ? 2 : 1;
  const left = pt.rects.length - given;
  return (
    `<style>\n  body { margin: 0; background: ${lv.bg} }\n  i { position: absolute; display: block }\n</style>\n\n` +
    `<!-- ${left} more ${left === 1 ? "shape" : "shapes"} to place -->\n` +
    pt.rects
      .slice(0, given)
      .map((r) => shape(r, true))
      .join("\n") +
    "\n"
  );
}

export function formatClock(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// A team's roster including the signed-in user, once they've joined —
// appended rather than replacing an "Open slot" so joining always shows up
// as the newest member, matching how a real join would land.
export function roster(
  team: CompTeam,
  meMember: CompMember | null,
  joinedTeamId: string | null,
): CompMember[] {
  return joinedTeamId === team.id && meMember
    ? [...team.members, meMember]
    : team.members;
}

export interface CompSlot {
  initials: string;
  name: string;
  program: string;
  ring: string;
  fill: string;
  ink: string;
  nameInk: string;
  tag: string;
  tagInk: string;
  open: boolean;
}

// Pads a team's roster out to TEAM_SIZE with "Open slot" placeholders, and
// styles the signed-in user's row (identity via reference equality against
// meMember — valid because both the roster and this call read the same
// meMember instance within one render).
export function slots(
  team: CompTeam,
  meMember: CompMember | null,
  joinedTeamId: string | null,
  currentPart: number,
): CompSlot[] {
  const members = roster(team, meMember, joinedTeamId);
  const out: CompSlot[] = members.map((m, i) => {
    const isYou = meMember !== null && m === meMember;
    return {
      initials: m.initials,
      name: m.name,
      program: m.program,
      ring: isYou ? "#6ee787" : team.color,
      fill: "#16241c",
      ink: isYou ? "#6ee787" : team.color,
      nameInk: isYou ? "#e9f5cd" : "#c6d6c0",
      tag: isYou ? `YOU · PART ${currentPart}` : `PART ${i + 1}`,
      tagInk: isYou ? "#6ee787" : "#7f9482",
      open: false,
    };
  });
  while (out.length < TEAM_SIZE) {
    out.push({
      initials: "—",
      name: "Open slot",
      program: "waiting for a coder",
      ring: "rgba(63,143,87,.3)",
      fill: "transparent",
      ink: "#4d6455",
      nameInk: "#5f7566",
      tag: "OPEN",
      tagInk: "#7f9482",
      open: true,
    });
  }
  return out;
}
