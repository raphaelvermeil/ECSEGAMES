package main

// The challenges. Levels 1-6 were ported from the original design mock's
// LEVELS array; 7-8 were authored here. In the rect levels every shape is
// an absolutely positioned <i>, and a challenge is that list of shapes over
// the level's background colour.
//
// This is the only definition of the targets. The PNGs in
// images/cs-comp/solutions are rendered from it (see main.go) rather than
// drawn anywhere else, because a target produced by a different tool would
// differ in antialiasing along every rotated and clipped edge and would
// tank every score.

// rect is one shape: position and size in the 300x200 canvas, plus an
// optional background, border-radius and extra CSS. radius is stored
// pre-formatted ("20px", "50%", "4px 4px 0 0"); an empty string means the
// property is left off entirely, as does an empty bg or extra.
type rect struct {
	x, y, w, h int
	bg         string
	radius     string
	extra      string
}

// part is one of a level's five challenges. A part is authored one of two
// ways and never both: as rects, the absolutely positioned shapes levels
// 1-6 are made of, or as target + scaffold, hand-written markup for the
// flow-layout levels. Flexbox cannot be expressed as a list of rectangles,
// which is the whole reason the second form exists.
//
// target is the answer's markup and scaffold the starter the editor opens
// with; both sit under the level's body background, which targetDoc and
// starter supply, so neither repeats it.
type part struct {
	title string
	rects []rect

	target   string
	scaffold string
}

// level groups five parts under a shared background colour.
//
// example is the worked snippet shown in the editor's HOW IT WORKS panel:
// the level's technique on a scene that is not one of its parts, so it can
// be read and copied without giving a part away. Empty on levels 1-6,
// which teach no technique, and the panel is hidden when it is.
type level struct {
	n       int
	name    string
	bg      string
	example string
	parts   []part
}

// levels is the competition: 8 levels of 5 parts.
var levels = []level{
	{n: 1, name: "WARM UP", bg: "#2a3d4f", parts: []part{
		{title: "Horizon", rects: []rect{
			{0, 130, 300, 70, "#2c5e40", "", ""},
			{0, 120, 300, 10, "#d99a5b", "", ""},
			{130, 70, 50, 50, "#ffd98a", "", ""},
		}},
		{title: "Goalposts", rects: []rect{
			{0, 150, 300, 50, "#2c5e40", "", ""},
			{64, 56, 10, 94, "#e9f5cd", "", ""},
			{226, 56, 10, 94, "#e9f5cd", "", ""},
			{64, 56, 172, 10, "#e9f5cd", "", ""},
		}},
		{title: "Scoreboard", rects: []rect{
			{40, 44, 220, 112, "#0b1310", "", ""},
			{56, 60, 80, 24, "#6ee787", "", ""},
			{56, 96, 120, 16, "#3f8f57", "", ""},
			{56, 120, 60, 12, "#2c5e40", "", ""},
		}},
		{title: "Cinder track", rects: []rect{
			{0, 120, 300, 80, "#8a5a3c", "", ""},
			{0, 148, 300, 5, "#e9f5cd", "", ""},
			{0, 176, 300, 5, "#e9f5cd", "", ""},
		}},
		{title: "Team flag", rects: []rect{
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{40, 40, 10, 140, "#9aa196", "", ""},
			{50, 44, 90, 50, "#6ee787", "", ""},
			{50, 64, 90, 8, "#0b1310", "", ""},
		}},
	}},
	{n: 2, name: "FIELD DAY", bg: "#1b2a20", parts: []part{
		{title: "Podium", rects: []rect{
			{0, 190, 300, 10, "#2c5e40", "", ""},
			{100, 110, 100, 90, "#e9f5cd", "", ""},
			{40, 140, 60, 60, "#9aa196", "", ""},
			{200, 150, 60, 50, "#7d857a", "", ""},
			{140, 80, 20, 20, "#ffd166", "10px", ""},
		}},
		{title: "Camp tent", rects: []rect{
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{70, 100, 160, 80, "#ff7b54", "", ""},
			{130, 132, 40, 48, "#1b2a20", "4px 4px 0 0", ""},
			{148, 58, 4, 44, "#9aa196", "", ""},
			{152, 58, 38, 18, "#ffd166", "", ""},
		}},
		{title: "Bonfire", rects: []rect{
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{96, 168, 108, 12, "#5a4632", "6px", ""},
			{96, 158, 108, 10, "#3f2e1e", "5px", "transform:rotate(-8deg)"},
			{128, 104, 44, 64, "#ff7b54", "", "border-radius:22px 22px 6px 6px"},
			{140, 124, 20, 44, "#ffd166", "", "border-radius:10px 10px 4px 4px"},
		}},
		{title: "Bench and tree", rects: []rect{
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{40, 148, 120, 12, "#8a5a3c", "", ""},
			{46, 160, 12, 20, "#5f6b5c", "", ""},
			{142, 160, 12, 20, "#5f6b5c", "", ""},
			{220, 120, 14, 60, "#4a3a26", "", ""},
			{196, 70, 62, 58, "#235838", "26px", ""},
		}},
		{title: "Match ball", rects: []rect{
			{0, 150, 300, 50, "#2c5e40", "", ""},
			{0, 186, 300, 5, "#e9f5cd", "", ""},
			{118, 148, 64, 10, "rgba(0,0,0,.35)", "50%", ""},
			{120, 88, 60, 60, "#e9f5cd", "30px", ""},
			{138, 106, 24, 24, "#0b1310", "5px", "transform:rotate(45deg)"},
		}},
	}},
	{n: 3, name: "GOLDEN HOUR", bg: "#142a33", parts: []part{
		{title: "Sailboat", rects: []rect{
			{0, 140, 300, 60, "#2f6f8f", "", ""},
			{40, 36, 36, 36, "#ffd98a", "18px", ""},
			{100, 124, 100, 20, "#8a5a3c", "0 0 20px 20px", ""},
			{148, 54, 4, 72, "#e9f5cd", "", ""},
			{104, 58, 44, 66, "#e9f5cd", "", "clip-path:polygon(100% 0,100% 100%,0 100%)"},
			{152, 58, 44, 66, "#ffd98a", "", "clip-path:polygon(0 0,100% 100%,0 100%)"},
			{0, 152, 300, 4, "rgba(233,245,205,.35)", "", ""},
		}},
		{title: "Ice cream", rects: []rect{
			{100, 176, 100, 12, "#9aa196", "6px", ""},
			{127, 118, 46, 66, "#c98a4b", "", "clip-path:polygon(0 0,100% 0,50% 100%)"},
			{122, 84, 56, 56, "#ff7b54", "28px", ""},
			{133, 60, 34, 34, "#e9f5cd", "17px", ""},
			{143, 50, 14, 14, "#c1121f", "7px", ""},
			{149, 42, 3, 10, "#3f8f57", "", ""},
		}},
		{title: "Windmill", rects: []rect{
			{0, 168, 300, 32, "#2c5e40", "", ""},
			{136, 52, 28, 118, "#e9f5cd", "4px 4px 0 0", ""},
			{142, 126, 16, 20, "#4a3a26", "2px", ""},
			{147, 24, 6, 96, "#5a4632", "", "transform:rotate(22.5deg)"},
			{147, 24, 6, 96, "#5a4632", "", "transform:rotate(67.5deg)"},
			{147, 24, 6, 96, "#5a4632", "", "transform:rotate(112.5deg)"},
			{147, 24, 6, 96, "#5a4632", "", "transform:rotate(157.5deg)"},
			{144, 66, 12, 12, "#0b1310", "6px", ""},
		}},
		{title: "Letter home", rects: []rect{
			{70, 70, 160, 100, "#e9f5cd", "4px", ""},
			{70, 166, 160, 6, "rgba(0,0,0,.3)", "", ""},
			{70, 70, 160, 58, "#c6d6c0", "", "clip-path:polygon(0 0,100% 0,50% 100%)"},
			{196, 78, 22, 26, "#ff7b54", "2px", ""},
			{86, 138, 80, 6, "#9aa196", "", ""},
			{86, 150, 50, 6, "#9aa196", "", ""},
			{200, 140, 18, 18, "#3f8f57", "9px", ""},
		}},
		{title: "Balloon ride", rects: []rect{
			{0, 170, 300, 30, "#2c5e40", "", ""},
			{118, 40, 64, 76, "#ff7b54", "50% 50% 45% 45%", ""},
			{146, 40, 8, 76, "#ffd166", "", ""},
			{136, 110, 3, 15, "#5a4632", "", "transform:rotate(-18deg)"},
			{161, 110, 3, 15, "#5a4632", "", "transform:rotate(18deg)"},
			{138, 124, 24, 18, "#8a5a3c", "3px", ""},
			{40, 58, 54, 16, "#e9f5cd", "8px", ""},
			{204, 96, 42, 12, "#e9f5cd", "6px", ""},
		}},
	}},
	{n: 4, name: "SCUNTS", bg: "#0f1512", parts: []part{
		{title: "Boombox", rects: []rect{
			{0, 176, 300, 24, "#1d3a2f", "", ""},
			{58, 88, 184, 88, "#9aa196", "8px", ""},
			{212, 46, 4, 44, "#9aa196", "2px", "transform:rotate(25deg)"},
			{126, 70, 48, 10, "#7d857a", "5px", ""},
			{130, 76, 6, 16, "#7d857a", "", ""},
			{164, 76, 6, 16, "#7d857a", "", ""},
			{78, 104, 52, 52, "#7d857a", "26px", ""},
			{90, 116, 28, 28, "#0b1310", "14px", ""},
			{170, 104, 52, 52, "#7d857a", "26px", ""},
			{182, 116, 28, 28, "#0b1310", "14px", ""},
			{136, 100, 28, 34, "#4cc9f0", "3px", ""},
			{136, 142, 10, 10, "#ffd166", "5px", ""},
			{154, 142, 10, 10, "#ff7b54", "5px", ""},
		}},
		{title: "Trophy", rects: []rect{
			{0, 176, 300, 24, "#1d3a2f", "", ""},
			{112, 62, 76, 58, "#ffd166", "6px 6px 40px 40px", ""},
			{112, 62, 76, 8, "#e9f5cd", "6px 6px 0 0", ""},
			{90, 72, 28, 30, "", "15px", "border:6px solid #ffd166"},
			{170, 72, 28, 30, "", "15px", "border:6px solid #ffd166"},
			{124, 78, 8, 26, "rgba(233,245,205,.45)", "4px", ""},
			{142, 82, 16, 16, "#ff7b54", "2px", "transform:rotate(45deg)"},
			{140, 114, 20, 36, "#ffd166", "", ""},
			{122, 150, 56, 12, "#9aa196", "2px", ""},
			{110, 162, 80, 14, "#7d857a", "3px", ""},
			{134, 166, 32, 8, "#0b1310", "2px", ""},
		}},
		{title: "Arcade cabinet", rects: []rect{
			{96, 180, 108, 8, "rgba(0,0,0,.45)", "", ""},
			{90, 30, 120, 150, "#1a2c22", "6px", ""},
			{104, 34, 92, 10, "#6ee787", "", ""},
			{104, 50, 92, 58, "#0b1310", "2px", ""},
			{112, 58, 76, 42, "#4cc9f0", "2px", ""},
			{104, 116, 92, 22, "#243c2e", "3px", ""},
			{118, 120, 16, 16, "#ffd166", "8px", ""},
			{142, 120, 16, 16, "#ff7b54", "8px", ""},
			{172, 112, 6, 22, "#e9f5cd", "3px", ""},
			{168, 106, 14, 8, "#c1121f", "4px", ""},
		}},
		{title: "Rocket", rects: []rect{
			{96, 182, 108, 8, "#5f6b5c", "", ""},
			{134, 38, 32, 20, "#ff7b54", "16px 16px 0 0", ""},
			{134, 56, 32, 80, "#e9f5cd", "4px 4px 4px 4px", ""},
			{142, 72, 16, 16, "#4cc9f0", "8px", ""},
			{118, 110, 18, 26, "#ff7b54", "", "clip-path:polygon(100% 0,100% 100%,0 100%)"},
			{164, 110, 18, 26, "#ff7b54", "", "clip-path:polygon(0 0,100% 100%,0 100%)"},
			{140, 136, 20, 34, "#ffd166", "6px 6px 12px 12px", ""},
			{145, 142, 10, 20, "#ff7b54", "4px 4px 8px 8px", ""},
			{110, 168, 42, 14, "rgba(233,245,205,.45)", "8px", ""},
			{158, 172, 36, 12, "rgba(233,245,205,.3)", "7px", ""},
		}},
		{title: "Robot mascot", rects: []rect{
			{0, 176, 300, 24, "#1d3a2f", "", ""},
			{143, 22, 14, 14, "#ff7b54", "7px", ""},
			{148, 32, 4, 14, "#e9f5cd", "", ""},
			{110, 44, 80, 62, "#9aa196", "6px", ""},
			{126, 64, 16, 16, "#4cc9f0", "8px", ""},
			{158, 64, 16, 16, "#4cc9f0", "8px", ""},
			{130, 88, 40, 6, "#0b1310", "3px", ""},
			{104, 110, 92, 60, "#7d857a", "6px", ""},
			{86, 118, 18, 42, "#9aa196", "4px", ""},
			{196, 118, 18, 42, "#9aa196", "4px", ""},
			{128, 124, 44, 20, "#243c2e", "3px", ""},
		}},
	}},
	{n: 5, name: "FINAL BOSS", bg: "#0b1310", parts: []part{
		{title: "The quad at golden hour", rects: []rect{
			{0, 0, 300, 96, "#2a3d4f", "", ""},
			{0, 96, 300, 10, "#d99a5b", "", ""},
			{0, 106, 300, 94, "#2c5e40", "", ""},
			{200, 36, 44, 44, "#ffd98a", "22px", "box-shadow:0 0 0 10px rgba(255,217,138,.18)"},
			{0, 116, 300, 20, "#8a5a3c", "", ""},
			{50, 98, 10, 42, "#4a3a26", "", ""},
			{32, 64, 46, 42, "#235838", "20px", ""},
			{180, 124, 60, 8, "#8a5a3c", "", ""},
			{186, 132, 8, 16, "#5f6b5c", "", ""},
			{232, 132, 8, 16, "#5f6b5c", "", ""},
			{86, 152, 86, 28, "#4cc9f0", "50%", ""},
			{96, 158, 30, 6, "rgba(233,245,205,.4)", "3px", ""},
		}},
		{title: "Night skyline", rects: []rect{
			{0, 150, 300, 50, "#101a15", "", ""},
			{236, 28, 34, 34, "#e9f5cd", "17px", ""},
			{20, 80, 54, 70, "#182633", "", ""},
			{84, 52, 62, 98, "#14212c", "", ""},
			{156, 96, 54, 54, "#182633", "", ""},
			{220, 70, 52, 80, "#14212c", "", ""},
			{32, 94, 10, 14, "#ffd166", "", ""},
			{52, 94, 10, 14, "rgba(255,209,102,.45)", "", ""},
			{98, 70, 10, 14, "#ffd166", "", ""},
			{120, 70, 10, 14, "rgba(255,209,102,.5)", "", ""},
			{168, 112, 10, 14, "#ffd166", "", ""},
			{236, 88, 10, 14, "#ffd166", "", ""},
		}},
		{title: "Ferris wheel", rects: []rect{
			{0, 168, 300, 32, "#1d3a2f", "", ""},
			{76, 44, 148, 148, "", "74px", "border:5px solid #6ee787"},
			{144, 110, 12, 12, "#e9f5cd", "6px", ""},
			{148, 48, 4, 64, "#3f8f57", "", "transform-origin:50% 100%"},
			{148, 48, 4, 64, "#3f8f57", "", "transform:rotate(90deg);transform-origin:50% 100%"},
			{148, 48, 4, 64, "#3f8f57", "", "transform:rotate(45deg);transform-origin:50% 100%"},
			{148, 48, 4, 64, "#3f8f57", "", "transform:rotate(-45deg);transform-origin:50% 100%"},
			{138, 36, 24, 18, "#ffd166", "3px", ""},
			{204, 102, 24, 18, "#ff7b54", "3px", ""},
			{72, 102, 24, 18, "#4cc9f0", "3px", ""},
			{138, 168, 24, 18, "#c792ea", "3px", ""},
			{130, 150, 8, 26, "#5f6b5c", "", "transform:rotate(14deg)"},
			{162, 150, 8, 26, "#5f6b5c", "", "transform:rotate(-14deg)"},
		}},
		{title: "Terminal", rects: []rect{
			{36, 32, 228, 136, "#0d1712", "4px", "box-shadow:0 8px 0 rgba(0,0,0,.35)"},
			{36, 32, 228, 18, "#1a2c22", "4px 4px 0 0", ""},
			{48, 37, 8, 8, "#ff7b54", "4px", ""},
			{62, 37, 8, 8, "#ffd166", "4px", ""},
			{76, 37, 8, 8, "#6ee787", "4px", ""},
			{52, 64, 14, 8, "#3f8f57", "", ""},
			{72, 64, 110, 8, "#6ee787", "", ""},
			{52, 82, 14, 8, "#3f8f57", "", ""},
			{72, 82, 74, 8, "#c6d6c0", "", ""},
			{52, 100, 14, 8, "#3f8f57", "", ""},
			{72, 100, 138, 8, "#4cc9f0", "", ""},
			{52, 118, 14, 8, "#3f8f57", "", ""},
			{72, 118, 10, 8, "#e9f5cd", "0", ""},
		}},
		{title: "Boss", rects: []rect{
			{46, 44, 208, 112, "#6ee787", "8px", ""},
			{54, 52, 192, 96, "#0b1310", "5px", ""},
			{76, 72, 44, 44, "#ff7b54", "22px", ""},
			{180, 72, 44, 44, "#ff7b54", "22px", ""},
			{88, 84, 18, 18, "#0b1310", "9px", ""},
			{192, 84, 18, 18, "#0b1310", "9px", ""},
			{70, 60, 44, 8, "#e9f5cd", "4px", "transform:rotate(-12deg)"},
			{186, 60, 44, 8, "#e9f5cd", "4px", "transform:rotate(12deg)"},
			{96, 124, 108, 16, "#e9f5cd", "4px", ""},
			{116, 124, 10, 16, "#0b1310", "", ""},
			{146, 124, 10, 16, "#0b1310", "", ""},
			{176, 124, 10, 16, "#0b1310", "", ""},
			{0, 180, 300, 20, "#093325", "", ""},
		}},
	}},
	{n: 6, name: "THE LANDSCAPE", bg: "#233b52", parts: []part{
		{title: "Mount Royal at dawn", rects: []rect{
			{0, 0, 300, 64, "#3c4a5e", "", ""},
			{0, 64, 300, 36, "#6b5560", "", ""},
			{0, 100, 300, 20, "#a3695a", "", ""},
			{130, 72, 40, 40, "#ffd98a", "20px", "box-shadow:0 0 0 9px rgba(255,217,138,.16)"},
			{16, 38, 150, 92, "#2c3e4f", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{132, 52, 140, 78, "#26364a", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{74, 40, 36, 26, "#e9f5cd", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{0, 118, 300, 30, "#1d3a2f", "", "clip-path:polygon(0 45%,18% 5%,40% 50%,62% 12%,84% 55%,100% 25%,100% 100%,0 100%)"},
			{0, 146, 300, 36, "#2f6f8f", "", ""},
			{40, 152, 120, 4, "rgba(233,245,205,.5)", "", ""},
			{92, 164, 86, 3, "rgba(233,245,205,.28)", "", ""},
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{40, 156, 6, 26, "#4a3a26", "", ""},
			{28, 128, 30, 32, "#235838", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{252, 158, 6, 24, "#4a3a26", "", ""},
			{242, 134, 26, 28, "#235838", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{186, 46, 7, 2, "#e9f5cd", "", ""},
		}},
		{title: "Lakeside dusk", rects: []rect{
			{0, 0, 300, 70, "#2a3d4f", "", ""},
			{0, 70, 300, 26, "#7a5a68", "", ""},
			{0, 96, 300, 18, "#c2705a", "", ""},
			{196, 80, 34, 34, "#ffd98a", "17px", ""},
			{0, 104, 300, 20, "#16261f", "", "clip-path:polygon(0 60%,14% 20%,32% 62%,52% 15%,72% 58%,88% 25%,100% 55%,100% 100%,0 100%)"},
			{0, 122, 300, 58, "#245a72", "", ""},
			{0, 122, 300, 4, "rgba(255,217,138,.35)", "", ""},
			{150, 132, 120, 4, "rgba(255,217,138,.4)", "", ""},
			{168, 146, 86, 3, "rgba(255,217,138,.25)", "", ""},
			{0, 178, 300, 22, "#1d3a2f", "", ""},
			{40, 140, 110, 8, "#5a4632", "", ""},
			{40, 148, 8, 32, "#4a3a26", "", ""},
			{142, 148, 8, 32, "#4a3a26", "", ""},
			{180, 150, 60, 12, "#8a5a3c", "0 0 14px 14px", ""},
			{196, 144, 8, 8, "#e9f5cd", "4px", ""},
			{214, 144, 26, 4, "#5a4632", "", "transform:rotate(-8deg)"},
			{60, 60, 44, 12, "#8fa3ae", "6px", ""},
		}},
		{title: "Winter campus", rects: []rect{
			{0, 0, 300, 110, "#2c4763", "", ""},
			{240, 24, 30, 30, "#e9f5cd", "15px", ""},
			{0, 110, 300, 90, "#dfe9ea", "", ""},
			{24, 58, 64, 54, "#1e2f3f", "3px 3px 0 0", ""},
			{36, 70, 14, 16, "#ffd166", "", ""},
			{62, 70, 14, 16, "rgba(255,209,102,.5)", "", ""},
			{36, 94, 14, 16, "rgba(255,209,102,.6)", "", ""},
			{104, 40, 80, 72, "#182633", "4px 4px 0 0", ""},
			{118, 52, 18, 20, "#ffd166", "", ""},
			{148, 52, 18, 20, "rgba(255,209,102,.45)", "", ""},
			{118, 82, 18, 20, "rgba(255,209,102,.55)", "", ""},
			{148, 82, 18, 20, "#ffd166", "", ""},
			{200, 66, 58, 46, "#1e2f3f", "3px 3px 0 0", ""},
			{212, 78, 16, 18, "#ffd166", "", ""},
			{24, 108, 64, 8, "#f4fbfb", "4px 4px 0 0", ""},
			{104, 36, 80, 8, "#f4fbfb", "4px 4px 0 0", ""},
			{200, 62, 58, 8, "#f4fbfb", "4px 4px 0 0", ""},
			{92, 120, 6, 42, "#3f2e1e", "", ""},
			{80, 96, 30, 30, "#1f5138", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{84, 116, 22, 22, "#2a6b47", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{268, 124, 5, 36, "#3f2e1e", "", ""},
			{258, 104, 26, 26, "#1f5138", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{0, 168, 300, 6, "rgba(255,255,255,.55)", "", ""},
		}},
		{title: "River valley", rects: []rect{
			{0, 0, 300, 52, "#4a6c8c", "", ""},
			{0, 52, 300, 18, "#8fa3ae", "", ""},
			{36, 16, 40, 40, "#ffd98a", "20px", ""},
			{0, 64, 160, 52, "#3f6b4a", "", "clip-path:polygon(0 100%,0 40%,40% 0,100% 60%,100% 100%)"},
			{140, 60, 160, 58, "#356043", "", "clip-path:polygon(0 60%,55% 0,100% 45%,100% 100%,0 100%)"},
			{0, 110, 300, 90, "#2f6f8f", "", "clip-path:polygon(38% 0,60% 0,100% 100%,0 100%)"},
			{0, 110, 300, 90, "#2c5e40", "", "clip-path:polygon(0 0,38% 0,0 100%)"},
			{0, 110, 300, 90, "#357d43", "", "clip-path:polygon(60% 0,100% 0,100% 100%)"},
			{104, 132, 26, 3, "rgba(233,245,205,.45)", "", ""},
			{92, 158, 44, 3, "rgba(233,245,205,.35)", "", ""},
			{80, 182, 60, 3, "rgba(233,245,205,.25)", "", ""},
			{30, 120, 6, 20, "#4a3a26", "", ""},
			{20, 102, 26, 24, "#235838", "13px", ""},
			{236, 124, 6, 22, "#4a3a26", "", ""},
			{226, 104, 26, 26, "#235838", "13px", ""},
			{186, 80, 44, 10, "#9aa196", "2px", ""},
			{196, 90, 6, 14, "#5f6b5c", "", ""},
			{214, 90, 6, 14, "#5f6b5c", "", ""},
		}},
		{title: "Desert highway", rects: []rect{
			{0, 0, 300, 96, "#e2955f", "", ""},
			{0, 0, 300, 44, "#c2705a", "", ""},
			{124, 52, 52, 52, "#ffe0a3", "26px", "box-shadow:0 0 0 12px rgba(255,224,163,.2)"},
			{0, 88, 110, 28, "#8a5a4c", "", "clip-path:polygon(0 100%,16% 20%,42% 24%,58% 0,80% 30%,100% 100%)"},
			{190, 84, 110, 32, "#7d5044", "", "clip-path:polygon(0 100%,22% 26%,48% 8%,70% 30%,100% 100%)"},
			{0, 112, 300, 88, "#caa06e", "", ""},
			{0, 112, 300, 88, "#3a3a3e", "", "clip-path:polygon(44% 0,56% 0,84% 100%,16% 100%)"},
			{148, 118, 4, 14, "#f4fbfb", "", ""},
			{147, 142, 6, 18, "#f4fbfb", "", ""},
			{146, 172, 8, 24, "#f4fbfb", "", ""},
			{56, 120, 10, 44, "#2f6b45", "6px", ""},
			{46, 132, 10, 20, "#2f6b45", "5px", ""},
			{66, 126, 10, 22, "#2f6b45", "5px", ""},
			{240, 126, 12, 50, "#2f6b45", "6px", ""},
			{228, 140, 12, 22, "#2f6b45", "6px", ""},
			{252, 134, 12, 24, "#2f6b45", "6px", ""},
			{96, 104, 4, 26, "#5f6b5c", "", ""},
			{88, 96, 20, 10, "#9aa196", "2px", ""},
		}},
	}},

	// Levels 7 and 8 are the flow-layout half of the set. The scenes repeat
	// one element, so they are built by giving a container a rule and
	// handing it children rather than by placing every shape.
	//
	// Pasting the children is the easy half and is meant to be: no part is
	// solved by it, because no two children in a row look the same. What
	// tells them apart is :nth-child, counting siblings in CSS, so the work
	// is in the stylesheet and the markup stays dumb.
	//
	// These parts are authored as target + scaffold rather than rects: a
	// flow layout is exactly the thing a list of rectangles cannot say.
	// Every child is a <div>, never an <i>: the flow levels drop the
	// i{display:block} rule the rect levels rely on, and an inline <i> with
	// no content collapses to nothing the moment it is not a flex item.
	{n: 7, name: "ASSEMBLY LINE", bg: "#1e3348", example: `<!-- EXAMPLE. Not this part, just the idea.
     Four bars in a row - and every second one a different colour,
     without a second class anywhere in the HTML. -->

<style>
  .row {
    /* the CONTAINER gets placed once, the way you already know */
    position: absolute;
    left: 40px; top: 80px;
    width: 220px; height: 40px;

    display: flex;            /* its children now sit in a row        */
    gap: 20px;                /* space between them                   */
    justify-content: center;  /* how the leftover space is handed out */
    align-items: center;      /* where they sit across the row        */
  }

  /* one rule, every bar. No left, no top on a child, ever again. */
  .row div { width: 40px; height: 24px; background: #6ee787 }

  /* and one more rule that only catches the 2nd and the 4th */
  .row div:nth-child(even) { background: #ffd166 }
</style>

<div class="row">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>

<!-- The four tags are identical. The CSS is what tells them apart, by
     COUNTING them, and that is the job from here on: paste the children,
     then select the ones you want.

       :nth-child(odd)     1st, 3rd, 5th ...
       :nth-child(even)    2nd, 4th, 6th ...
       :nth-child(3n)      every 3rd
       :nth-child(3n + 1)  1st, 4th, 7th ...
       :nth-child(2)       just the 2nd

     Worth reading up on: justify-content, align-items, flex-direction,
     gap, and :nth-child.

     4 x 40px + 3 x 20px of gap = 220px, which is why the row is 220
     wide. Numbers that divide evenly are how a scene lands on whole
     pixels, and whole pixels are how it matches the target. -->`, parts: []part{

		{title: "Bunting", target: `<style>
  .ground { position: absolute; left: 0; top: 160px; width: 300px; height: 40px; background: #2c5e40 }
  .pole { position: absolute; top: 40px; width: 5px; height: 122px; background: #8a5a3c }
  .left { left: 6px }
  .right { left: 289px }
  .string { position: absolute; left: 6px; top: 44px; width: 288px; height: 3px; background: #e9f5cd }
  .line {
    position: absolute;
    left: 6px; top: 47px;
    width: 288px; height: 32px;
    display: flex;
    justify-content: space-between;
  }
  .line div { width: 24px; height: 32px; background: #ffd166; clip-path: polygon(0 0, 100% 0, 50% 100%) }
  .line div:nth-child(even) { background: #ff7b54 }
</style>

<div class="ground"></div>
<div class="pole left"></div>
<div class="pole right"></div>
<div class="string"></div>

<div class="line">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>`, scaffold: `<style>
  .ground { position: absolute; left: 0; top: 160px; width: 300px; height: 40px; background: #2c5e40 }
  .pole { position: absolute; top: 40px; width: 5px; height: 122px; background: #8a5a3c }
  .left { left: 6px }
  .right { left: 289px }
  .string { position: absolute; left: 6px; top: 44px; width: 288px; height: 3px; background: #e9f5cd }

  .line {
    position: absolute;
    left: 6px; top: 47px;
    width: 288px; height: 32px;
    display: flex;
    /* nine flags share these 288px, the outer two touching the poles.
       One justify-content value does the whole thing. */
  }

  /* every flag is this. Every second flag is #ff7b54 instead, and the
     tags below are all identical, so that cannot come from the HTML. */
  .line div { width: 24px; height: 32px; background: #ffd166; clip-path: polygon(0 0, 100% 0, 50% 100%) }
</style>

<div class="ground"></div>
<div class="pole left"></div>
<div class="pole right"></div>
<div class="string"></div>

<!-- 1 flag hung, 8 to go. Copy the tag, not the numbers. -->
<div class="line">
  <div></div>
</div>`},

		{title: "Balloon release", target: `<style>
  .ground { position: absolute; left: 0; top: 168px; width: 300px; height: 32px; background: #2c5e40 }
  .horizon { position: absolute; left: 0; top: 164px; width: 300px; height: 4px; background: #3f8f57 }
  .bunch {
    position: absolute;
    left: 18px; top: 34px;
    width: 264px; height: 102px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .balloon { width: 34px; height: 102px }
  .balloon .body { width: 34px; height: 44px; border-radius: 50%; background: #ff7b54 }
  .balloon .tail { width: 2px; height: 58px; margin: 0 auto; background: #e9f5cd }
  .bunch .balloon:nth-child(even) { margin-top: 18px }
  .bunch .balloon:nth-child(even) .body { background: #4cc9f0 }
</style>

<div class="horizon"></div>
<div class="ground"></div>

<div class="bunch">
  <div class="balloon"><div class="body"></div><div class="tail"></div></div>
  <div class="balloon"><div class="body"></div><div class="tail"></div></div>
  <div class="balloon"><div class="body"></div><div class="tail"></div></div>
  <div class="balloon"><div class="body"></div><div class="tail"></div></div>
  <div class="balloon"><div class="body"></div><div class="tail"></div></div>
  <div class="balloon"><div class="body"></div><div class="tail"></div></div>
</div>`, scaffold: `<style>
  .ground { position: absolute; left: 0; top: 168px; width: 300px; height: 32px; background: #2c5e40 }
  .horizon { position: absolute; left: 0; top: 164px; width: 300px; height: 4px; background: #3f8f57 }

  .bunch {
    position: absolute;
    left: 18px; top: 34px;
    width: 264px; height: 102px;
    display: flex;
    align-items: flex-start;
    /* six balloons, evenly spread, the outer two on the container edges */
  }

  /* a flex child can hold children of its own: body on top, string under.
     margin: 0 auto is what keeps the 2px string centred under the 34px
     balloon without either of them knowing where they are on screen. */
  .balloon { width: 34px; height: 102px }
  .balloon .body { width: 34px; height: 44px; border-radius: 50%; background: #ff7b54 }
  .balloon .tail { width: 2px; height: 58px; margin: 0 auto; background: #e9f5cd }

  /* every second balloon is #4cc9f0 and hangs 18px lower. All six tags
     below are identical, so the CSS has to do the choosing - and the
     colour lives on a CHILD of the balloon you select, not on it. */
</style>

<div class="horizon"></div>
<div class="ground"></div>

<!-- 1 balloon up, 5 to go. -->
<div class="bunch">
  <div class="balloon"><div class="body"></div><div class="tail"></div></div>
</div>`},

		{title: "Chain", target: `<style>
  .beam { position: absolute; left: 0; top: 0; width: 300px; height: 10px; background: #5a4632 }
  .weight { position: absolute; left: 118px; top: 188px; width: 64px; height: 12px; background: #5f6b5c }
  .chain {
    position: absolute;
    left: 120px; top: 10px;
    width: 60px; height: 178px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .chain div {
    box-sizing: border-box;
    width: 40px; height: 22px;
    border: 4px solid #9aa196;
    border-radius: 11px;
  }
  .chain div:nth-child(3n) { border-color: #ffd166 }
</style>

<div class="beam"></div>
<div class="weight"></div>

<div class="chain">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>`, scaffold: `<style>
  .beam { position: absolute; left: 0; top: 0; width: 300px; height: 10px; background: #5a4632 }
  .weight { position: absolute; left: 118px; top: 188px; width: 64px; height: 12px; background: #5f6b5c }

  .chain {
    position: absolute;
    left: 120px; top: 10px;
    width: 60px; height: 178px;
    display: flex;
    gap: 4px;
    /* a flex container runs across by default. This one has to run DOWN,
       and a link is narrower than the container, so without a second
       property the links stretch to the full 60px instead of centring. */
  }

  /* box-sizing: border-box makes the 4px border count inside the 40x22,
     so a link measures 40x22 on screen and the gap maths stays whole. */
  .chain div {
    box-sizing: border-box;
    width: 40px; height: 22px;
    border: 4px solid #9aa196;
    border-radius: 11px;
  }

  /* two of the seven links are brass instead of steel. Count which two
     off the target, then write the rule that catches exactly those. */
</style>

<div class="beam"></div>
<div class="weight"></div>

<!-- 1 link hung, 6 to go. 7 x 22px + 6 x 4px of gap = 178px. -->
<div class="chain">
  <div></div>
</div>`},

		{title: "Picket fence", target: `<style>
  .ground { position: absolute; left: 0; top: 162px; width: 300px; height: 38px; background: #2c5e40 }
  .fence {
    position: absolute;
    left: 6px; top: 74px;
    width: 288px; height: 96px;
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
  }
  .fence div {
    width: 22px; height: 96px;
    background: #e9f5cd;
    clip-path: polygon(50% 0, 100% 16px, 100% 100%, 0 100%, 0 16px);
  }
  .fence div:nth-child(even) { height: 78px }
  .rail { position: absolute; left: 6px; width: 288px; height: 8px; background: #9aa196 }
  .upper { top: 98px }
  .lower { top: 140px }
</style>

<div class="ground"></div>

<div class="fence">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>

<div class="rail upper"></div>
<div class="rail lower"></div>`, scaffold: `<style>
  .ground { position: absolute; left: 0; top: 162px; width: 300px; height: 38px; background: #2c5e40 }

  .fence {
    position: absolute;
    left: 6px; top: 74px;
    width: 288px; height: 96px;
    display: flex;
    align-items: flex-end;
    /* eight pickets, and this time the gap at each END is half the gap
       between them. There is a justify-content value that means exactly
       that, and it is not space-between. */
  }

  /* a full-height picket. The short ones are 78px, and they still stand
     on the ground rather than hanging - that is what align-items above
     is already doing for you. */
  .fence div {
    width: 22px; height: 96px;
    background: #e9f5cd;
    clip-path: polygon(50% 0, 100% 16px, 100% 100%, 0 100%, 0 16px);
  }

  /* the rails are absolute, laid over the flex row. The two coexist
     fine: a positioned element still paints on top of the flow. */
  .rail { position: absolute; left: 6px; width: 288px; height: 8px; background: #9aa196 }
  .upper { top: 98px }
  .lower { top: 140px }
</style>

<div class="ground"></div>

<!-- 1 picket in, 7 to go. -->
<div class="fence">
  <div></div>
</div>

<div class="rail upper"></div>
<div class="rail lower"></div>`},

		{title: "Level meter", target: `<style>
  .panel { position: absolute; left: 6px; top: 26px; width: 288px; height: 148px; background: #142a33 }
  .tag { position: absolute; left: 12px; top: 34px; width: 80px; height: 6px; background: #6ee787 }
  .baseline { position: absolute; left: 12px; top: 160px; width: 276px; height: 4px; background: #e9f5cd }
  .meter {
    position: absolute;
    left: 12px; top: 40px;
    width: 276px; height: 120px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .meter div { width: 12px; height: 36px; border-radius: 3px; background: #4cc9f0 }
  .meter div:nth-child(3n + 1) { height: 96px }
  .meter div:nth-child(3n + 2) { height: 64px }
</style>

<div class="panel"></div>
<div class="tag"></div>

<div class="meter">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>

<div class="baseline"></div>`, scaffold: `<style>
  .panel { position: absolute; left: 6px; top: 26px; width: 288px; height: 148px; background: #142a33 }
  .tag { position: absolute; left: 12px; top: 34px; width: 80px; height: 6px; background: #6ee787 }
  .baseline { position: absolute; left: 12px; top: 160px; width: 276px; height: 4px; background: #e9f5cd }

  .meter {
    position: absolute;
    left: 12px; top: 40px;
    width: 276px; height: 120px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  /* the shortest bar. The other two heights in the sawtooth are 96px and
     64px, and the pattern restarts every third bar - twelve bars, four
     repeats of it. Two more rules, no extra classes. */
  .meter div { width: 12px; height: 36px; border-radius: 3px; background: #4cc9f0 }
</style>

<div class="panel"></div>
<div class="tag"></div>

<!-- 1 bar standing, 11 to go. -->
<div class="meter">
  <div></div>
</div>

<div class="baseline"></div>`},
	}},

	{n: 8, name: "THE LONG VIEW", bg: "#0f1a26", example: `<!-- EXAMPLE. Not this part, just the idea.
     A ridge of five posts, every third one taller, standing on the
     ground instead of hanging from the top of the band. -->

<style>
  .band {
    position: absolute;
    left: 50px; top: 60px;
    width: 200px; height: 80px;

    display: flex;
    justify-content: center;
    align-items: flex-end;   /* stand them on the bottom edge */
    gap: 10px;
  }

  .band div { width: 30px; height: 40px; background: #2c5e40 }
  .band div:nth-child(3n) { height: 70px; background: #235838 }
</style>

<div class="band">
  <div></div><div></div><div></div><div></div><div></div>
</div>

<!-- 5 x 30px + 4 x 10px of gap = 190px, centred in 200px.

     A landscape is that, several times over. A flex child can be a flex
     container itself, so a scene becomes a COLUMN of bands, each band a
     ROW of repeats:

  .scene { display: flex; flex-direction: column }   <- stacks the bands
  .scene > div { display: flex }                     <- each band a row

     The bands are stacked in order and their heights add up to 200, so
     no band is ever placed: sky first, then whatever is behind, then
     whatever is in front. Give a band its own background and it becomes
     that layer of the scene.

     Also worth knowing here:
       flex-wrap: wrap      lets a row spill onto the next line
       align-content        where those wrapped lines sit in the box
       box-sizing: border-box   padding and border count INSIDE a width
       :nth-child(3n), :nth-child(odd), :nth-child(even)   count siblings -->`, parts: []part{

		{title: "Pine ridge", target: `<style>
  .sun { position: absolute; left: 240px; top: 24px; width: 34px; height: 34px; border-radius: 50%; background: #ffd98a }
  .ridge {
    position: absolute;
    left: 0; top: 60px;
    width: 300px; height: 140px;
    box-sizing: border-box;
    background: #17293a;
    border-bottom: 34px solid #2c5e40;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 6px;
  }
  .ridge div {
    width: 26px; height: 70px;
    background: #235838;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  .ridge div:nth-child(even) { height: 92px; background: #1d4a30 }
</style>

<div class="sun"></div>

<div class="ridge">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>`, scaffold: `<style>
  .sun { position: absolute; left: 240px; top: 24px; width: 34px; height: 34px; border-radius: 50%; background: #ffd98a }

  /* the ground is not a separate block: it is this band's bottom border,
     which is why box-sizing matters - the 34px comes out of the 140px. */
  .ridge {
    position: absolute;
    left: 0; top: 60px;
    width: 300px; height: 140px;
    box-sizing: border-box;
    background: #17293a;
    border-bottom: 34px solid #2c5e40;
    display: flex;
    gap: 6px;
    /* nine pines, centred as a group, rooted on the grass rather than
       hanging off the top of the band. Two properties. */
  }

  /* the short pine. The tall ones are 92px and #1d4a30, they alternate
     with these, and all nine tags below are identical. */
  .ridge div {
    width: 26px; height: 70px;
    background: #235838;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
</style>

<div class="sun"></div>

<!-- 1 pine, 8 to go. 9 x 26px + 8 x 6px of gap = 282px, centred in 300. -->
<div class="ridge">
  <div></div>
</div>`},

		{title: "City skyline", target: `<style>
  .city {
    position: absolute;
    left: 0; top: 40px;
    width: 300px; height: 160px;
    box-sizing: border-box;
    background: #16283a;
    border-bottom: 20px solid #1d3550;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 6px;
  }
  .tower {
    box-sizing: border-box;
    padding: 8px;
    background: #0f2033;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 6px;
  }
  .tower div { width: 12px; height: 12px; background: #ffd166 }
  .city .tower:nth-child(3n + 1) { width: 52px; height: 110px }
  .city .tower:nth-child(3n + 2) { width: 46px; height: 76px }
  .city .tower:nth-child(3n) { width: 58px; height: 94px }
</style>

<div class="city">
  <div class="tower">
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
  </div>
  <div class="tower">
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
  <div class="tower">
    <div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div>
  </div>
  <div class="tower">
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
  </div>
  <div class="tower">
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`, scaffold: `<style>
  .city {
    position: absolute;
    left: 0; top: 40px;
    width: 300px; height: 160px;
    box-sizing: border-box;
    background: #16283a;
    border-bottom: 20px solid #1d3550;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 6px;
  }

  /* a tower is a flex container too, and its windows are the repeat.
     Two windows fit across every tower and the rest have to spill onto
     the next line by themselves - a plain flex row would sit them all
     on one line and let them run off the side. The lines also need to
     pack to the TOP of the tower rather than spread down it. */
  .tower {
    box-sizing: border-box;
    padding: 8px;
    background: #0f2033;
    display: flex;
    gap: 6px;
  }
  .tower div { width: 12px; height: 12px; background: #ffd166 }

  /* five towers, three sizes, cycling. The first is written out - the
     other two sizes are 46x76 and 58x94, in that order after this one. */
  .city .tower:nth-child(3n + 1) { width: 52px; height: 110px }
</style>

<!-- tower 1 of 5, with its 10 windows. The others carry 6, 8, 10 and 6
     windows - count them off the target. -->
<div class="city">
  <div class="tower">
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`},

		{title: "Mountain range", target: `<style>
  .scene {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    display: flex;
    flex-direction: column;
  }
  .sky {
    height: 50px;
    background: #17293a;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }
  .sky div { width: 34px; height: 8px; border-radius: 4px; background: #2f4a5e }
  .range {
    height: 90px;
    background: #1d3550;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }
  .range div {
    width: 50px; height: 62px;
    background: #26364a;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  .range div:nth-child(odd) { height: 90px; background: #2c3e4f }
  .lake {
    height: 60px;
    background: #2f6f8f;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 6px;
  }
  .lake div { width: 120px; height: 5px; background: #4a8fae }
  .lake div:nth-child(odd) { width: 180px }
</style>

<div class="scene">
  <div class="sky">
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="range">
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="lake">
    <div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`, scaffold: `<style>
  /* the whole canvas is one flex column of three bands. Nothing in this
     part is placed by hand: 50 + 90 + 60 = 200, so they stack to fill it. */
  .scene {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    display: flex;
    flex-direction: column;
  }

  /* band 1 of 3, finished, and the shape of the other two. */
  .sky {
    height: 50px;
    background: #17293a;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }
  .sky div { width: 34px; height: 8px; border-radius: 4px; background: #2f4a5e }

  /* band 2 of 3: six peaks, no gap at all, sitting on the band's floor.
     6 x 50px = 300px, so they fill the width exactly. The short peak is
     below; the tall ones are 90px and #2c3e4f and they alternate. */
  .range {
    height: 90px;
    background: #1d3550;
    /* ... */
  }
  .range div {
    width: 50px; height: 62px;
    background: #26364a;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  /* band 3 of 3: five ripples STACKED, centred both ways, 6px apart.
     The narrow one is below; every other ripple is 180px wide. */
  .lake {
    height: 60px;
    background: #2f6f8f;
    /* ... */
  }
  .lake div { width: 120px; height: 5px; background: #4a8fae }
</style>

<!-- 6 clouds, 6 peaks, 5 ripples. -->
<div class="scene">
  <div class="sky">
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="range">
    <div></div>
  </div>

  <div class="lake">
    <div></div>
  </div>
</div>`},

		{title: "Orchard", target: `<style>
  .orchard {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    display: flex;
    flex-direction: column;
  }
  .sky { height: 56px; background: #17293a }
  .far, .mid, .near {
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }
  .far { height: 40px; background: #1d3550; gap: 10px }
  .mid { height: 48px; background: #16283a; gap: 12px }
  .near {
    height: 56px;
    background: #122030;
    gap: 18px;
    box-sizing: border-box;
    border-bottom: 14px solid #1b3326;
  }
  .far div {
    width: 14px; height: 26px;
    background: #2f5d45;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  .mid div {
    width: 20px; height: 34px;
    background: #27523c;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  .near div {
    width: 28px; height: 40px;
    background: #1d4a30;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
</style>

<div class="orchard">
  <div class="sky"></div>

  <div class="far">
    <div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="mid">
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div>
  </div>

  <div class="near">
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`, scaffold: `<style>
  /* four bands: 56 + 40 + 48 + 56 = 200. The rows of trees get fewer,
     bigger and darker as they come forward, which is the whole trick -
     three rows of the same thing at three scales. */
  .orchard {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    display: flex;
    flex-direction: column;
  }
  .sky { height: 56px; background: #17293a }

  /* all three rows share this - trees rooted on each band's floor. */
  .far, .mid, .near {
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }

  .far { height: 40px; background: #1d3550; gap: 10px }
  .mid { height: 48px; background: #16283a; gap: 12px }
  .near {
    height: 56px;
    background: #122030;
    gap: 18px;
    box-sizing: border-box;
    border-bottom: 14px solid #1b3326;
  }

  .far div {
    width: 14px; height: 26px;
    background: #2f5d45;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  /* mid trees are 20x34 on #27523c, near trees 28x40 on #1d4a30, both
     the same triangle. */
</style>

<!-- the far row is planted: 12 trees. The mid row has 9 and the near
     row 6.
       far:  12 x 14px + 11 x 10px of gap = 278px
       mid:   9 x 20px +  8 x 12px of gap = 276px
       near:  6 x 28px +  5 x 18px of gap = 258px
     all centred in 300. -->
<div class="orchard">
  <div class="sky"></div>

  <div class="far">
    <div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="mid">
    <div></div>
  </div>

  <div class="near">
    <div></div>
  </div>
</div>`},

		{title: "Boreal lake", target: `<style>
  .scene {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    display: flex;
    flex-direction: column;
  }
  .sky {
    height: 44px;
    background: #17293a;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .sky div { width: 32px; height: 7px; border-radius: 4px; background: #2a4055 }
  .peaks {
    height: 52px;
    background: #1d3550;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }
  .peaks div {
    width: 60px; height: 38px;
    background: #26364a;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  .peaks div:nth-child(odd) { height: 52px }
  .trees {
    height: 34px;
    background: #1a2e24;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 5px;
  }
  .trees div {
    width: 14px; height: 30px;
    background: #235838;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  .water {
    height: 46px;
    background: #2f6f8f;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 7px;
  }
  .water div { width: 130px; height: 6px; background: #4a8fae }
  .water div:nth-child(odd) { width: 190px }
  .dock {
    height: 24px;
    background: #17293a;
    display: flex;
    justify-content: center;
    gap: 4px;
  }
  .dock div { width: 20px; background: #5a4632 }
</style>

<div class="scene">
  <div class="sky">
    <div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="peaks">
    <div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="trees">
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="water">
    <div></div><div></div><div></div><div></div>
  </div>

  <div class="dock">
    <div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`, scaffold: `<style>
  /* five bands: 44 + 52 + 34 + 46 + 24 = 200. Sky, peaks, treeline,
     water, dock - each one a row of the same thing repeated, and the
     only band that stacks downwards is the water. */
  .scene {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    display: flex;
    flex-direction: column;
  }

  /* band 1 of 5, finished. The other four are yours. */
  .sky {
    height: 44px;
    background: #17293a;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .sky div { width: 32px; height: 7px; border-radius: 4px; background: #2a4055 }

  /* band 2: five peaks, no gap, 5 x 60px = 300px. The low peak is 38px,
     every other one reaches the full 52px. */
  .peaks { height: 52px; background: #1d3550 }
  .peaks div {
    width: 60px; height: 38px;
    background: #26364a;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  /* band 3: fifteen pines, 5px apart, centred, rooted on the floor.
     15 x 14px + 14 x 5px of gap = 280px. */
  .trees { height: 34px; background: #1a2e24 }
  .trees div {
    width: 14px; height: 30px;
    background: #235838;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  /* band 4: four ripples STACKED and centred, 7px apart. The short one
     is 130px, every other one is 190px. */
  .water { height: 46px; background: #2f6f8f }
  .water div { width: 130px; height: 6px; background: #4a8fae }

  /* band 5: twelve planks, 4px apart, centred, each one as tall as the
     band - which is what a flex child does when you leave its height
     alone. 12 x 20px + 11 x 4px of gap = 284px. */
  .dock { height: 24px; background: #17293a }
  .dock div { width: 20px; background: #5a4632 }
</style>

<div class="scene">
  <div class="sky">
    <div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="peaks">
    <div></div>
  </div>

  <div class="trees">
    <div></div>
  </div>

  <div class="water">
    <div></div>
  </div>

  <div class="dock">
    <div></div>
  </div>
</div>`},
	}},
}
