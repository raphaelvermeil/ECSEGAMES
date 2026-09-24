package main

// The challenges. Levels 1-6 were ported from the original design mock's
// LEVELS array; 7-10 were authored here. In the rect levels every shape is
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
// given overrides how many leading rects the starter hands over (see
// starter()). Zero means the default for the level. It is here for a
// scene whose first shapes alone read as nothing: the wheel is four
// shapes in, and without it the Ferris wheel opens on a stick.
type part struct {
	title string
	rects []rect
	given int

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

// levels is the competition: 10 levels of 5 parts.
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
	{n: 5, name: "AFTER DARK", bg: "#0b1310", parts: []part{
		// The tree and the bench both used to straddle the track band, so the
		// tree grew out of the running surface and the bench sat on it. Both
		// now stand on the near grass, in front of the track. The bench is a
		// real bench rather than a plank on two posts: back rail, two uprights,
		// a seat slab and two legs.
		{title: "The quad at golden hour", rects: []rect{
			{0, 0, 300, 96, "#2a3d4f", "", ""},
			{0, 96, 300, 10, "#d99a5b", "", ""},
			{0, 106, 300, 94, "#2c5e40", "", ""},
			{200, 36, 44, 44, "#ffd98a", "22px", "box-shadow:0 0 0 10px #50595a"},
			{0, 116, 300, 20, "#8a5a3c", "", ""},
			{50, 138, 10, 38, "#4a3a26", "", ""},
			{30, 100, 48, 46, "#235838", "24px", ""},
			{188, 138, 64, 5, "#8a5a3c", "", ""},
			{191, 140, 5, 14, "#6b4228", "", ""},
			{246, 140, 5, 14, "#6b4228", "", ""},
			{184, 152, 72, 7, "#8a5a3c", "", ""},
			{189, 159, 7, 13, "#5f6b5c", "", ""},
			{244, 159, 7, 13, "#5f6b5c", "", ""},
			{86, 152, 86, 28, "#4cc9f0", "50%", ""},
			{96, 158, 30, 6, "#8bdbe2", "3px", ""},
			{14, 182, 36, 15, "#7d857a", "12px 12px 4px 4px", ""},
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
		// The wheel is one circle centred on (150,100) with an outer radius of
		// 66, and everything else is placed off that centre. The rim is 122x122
		// of content plus a 5px border, which is 132 across the border box, so
		// border-radius:66px makes it an exact circle. Get that arithmetic wrong
		// and the rim drifts off the hub — and if it drifts past y=200 the page
		// grows a scrollbar, which the renderer screenshots into the target.
		//
		// Each spoke is a full diameter rotated about its own centre, so four
		// rects give eight evenly spaced arms. Their half-length is 61, the rim's
		// inner radius, so they meet the ring exactly.
		{title: "Ferris wheel", given: 4, rects: []rect{
			{0, 168, 300, 32, "#1d3a2f", "", ""},
			{146, 100, 8, 96, "#5f6b5c", "", "transform:rotate(-16deg);transform-origin:50% 0"},
			{146, 100, 8, 96, "#5f6b5c", "", "transform:rotate(16deg);transform-origin:50% 0"},
			{84, 34, 122, 122, "", "66px", "border:5px solid #6ee787"},
			{148, 39, 4, 122, "#3f8f57", "", ""},
			{148, 39, 4, 122, "#3f8f57", "", "transform:rotate(90deg)"},
			{148, 39, 4, 122, "#3f8f57", "", "transform:rotate(45deg)"},
			{148, 39, 4, 122, "#3f8f57", "", "transform:rotate(-45deg)"},
			{142, 92, 16, 16, "#e9f5cd", "8px", ""},
			{139, 26, 22, 16, "#ffd166", "3px", ""},
			{205, 92, 22, 16, "#ff7b54", "3px", ""},
			{139, 158, 22, 16, "#c792ea", "3px", ""},
			{73, 92, 22, 16, "#4cc9f0", "3px", ""},
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
			{130, 72, 40, 40, "#ffd98a", "20px", "box-shadow:0 0 0 9px #836a67"},
			{16, 38, 150, 92, "#2c3e4f", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{132, 52, 140, 78, "#26364a", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{74, 40, 36, 26, "#e9f5cd", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{0, 120, 300, 28, "#1d3a2f", "", ""},
			{0, 146, 300, 36, "#2f6f8f", "", ""},
			{40, 152, 120, 4, "#8fb2ae", "", ""},
			{92, 164, 86, 3, "#5f93a0", "", ""},
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{40, 156, 6, 26, "#4a3a26", "", ""},
			{28, 128, 30, 32, "#235838", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{252, 158, 6, 24, "#4a3a26", "", ""},
			{242, 134, 26, 28, "#235838", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
		}},
		{title: "Lakeside dusk", rects: []rect{
			{0, 0, 300, 70, "#2a3d4f", "", ""},
			{0, 70, 300, 26, "#7a5a68", "", ""},
			{0, 96, 300, 18, "#c2705a", "", ""},
			{196, 80, 34, 34, "#ffd98a", "17px", ""},
			{0, 112, 300, 12, "#16261f", "", ""},
			{0, 122, 300, 58, "#245a72", "", ""},
			{0, 132, 300, 4, "#4a6b6a", "", ""},
			{150, 132, 120, 4, "#a3906a", "", ""},
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
			{24, 54, 64, 8, "#f4fbfb", "4px 4px 0 0", ""},
			{36, 70, 14, 16, "#ffd166", "", ""},
			{104, 40, 80, 72, "#182633", "4px 4px 0 0", ""},
			{104, 36, 80, 8, "#f4fbfb", "4px 4px 0 0", ""},
			{118, 52, 18, 20, "#ffd166", "", ""},
			{148, 52, 18, 20, "#6b6347", "", ""},
			{200, 66, 58, 46, "#1e2f3f", "3px 3px 0 0", ""},
			{200, 62, 58, 8, "#f4fbfb", "4px 4px 0 0", ""},
			{212, 78, 16, 18, "#ffd166", "", ""},
			{92, 120, 6, 42, "#3f2e1e", "", ""},
			{80, 96, 30, 34, "#1f5138", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{0, 168, 300, 6, "#f1f5f6", "", ""},
		}},
		{title: "River valley", rects: []rect{
			{0, 0, 300, 64, "#4a6c8c", "", ""},
			{36, 16, 40, 40, "#ffd98a", "20px", ""},
			{0, 64, 160, 52, "#3f6b4a", "", "clip-path:polygon(40% 0,100% 100%,0 100%)"},
			{140, 60, 160, 58, "#356043", "", "clip-path:polygon(55% 0,100% 100%,0 100%)"},
			{0, 110, 300, 90, "#2f6f8f", "", "clip-path:polygon(38% 0,60% 0,100% 100%,0 100%)"},
			{0, 110, 300, 90, "#2c5e40", "", "clip-path:polygon(0 0,38% 0,0 100%)"},
			{0, 110, 300, 90, "#357d43", "", "clip-path:polygon(60% 0,100% 0,100% 100%)"},
			{104, 132, 26, 3, "#8fb0b4", "", ""},
			{92, 158, 44, 3, "#6791a3", "", ""},
			{30, 120, 6, 20, "#4a3a26", "", ""},
			{20, 102, 26, 24, "#235838", "13px", ""},
			{236, 124, 6, 22, "#4a3a26", "", ""},
			{226, 104, 26, 26, "#235838", "13px", ""},
			{186, 80, 44, 10, "#9aa196", "2px", ""},
			{196, 90, 6, 14, "#5f6b5c", "", ""},
			{214, 90, 6, 14, "#5f6b5c", "", ""},
		}},
		{title: "Desert highway", rects: []rect{
			{0, 0, 300, 112, "#e2955f", "", ""},
			{0, 0, 300, 44, "#c2705a", "", ""},
			{124, 52, 52, 52, "#ffe0a3", "26px", "box-shadow:0 0 0 12px #e8a46d"},
			{0, 88, 110, 28, "#8a5a4c", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{190, 84, 110, 32, "#7d5044", "", "clip-path:polygon(45% 0,100% 100%,0 100%)"},
			{0, 112, 300, 88, "#caa06e", "", ""},
			{0, 112, 300, 88, "#3a3a3e", "", "clip-path:polygon(44% 0,56% 0,84% 100%,16% 100%)"},
			{148, 118, 4, 14, "#f4fbfb", "", ""},
			{147, 142, 6, 18, "#f4fbfb", "", ""},
			{146, 172, 8, 24, "#f4fbfb", "", ""},
			{56, 120, 10, 44, "#2f6b45", "6px", ""},
			{46, 132, 10, 20, "#2f6b45", "5px", ""},
			{240, 126, 12, 50, "#2f6b45", "6px", ""},
			{228, 140, 12, 22, "#2f6b45", "6px", ""},
			{96, 104, 4, 26, "#5f6b5c", "", ""},
			{88, 96, 20, 10, "#9aa196", "2px", ""},
		}},
	}},

	// Levels 7 to 10 are the flow-layout half of the set. The scenes repeat
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
	{n: 7, name: "ASSEMBLY LINE", bg: "#1e3348", example: `<!-- THE IDEA: place ONE box, and let flexbox line up its children.
     You never write left/top on a child again. -->

<style>
  .row {
    position: absolute;        /* the box is placed once, like before */
    left: 40px; top: 80px;
    width: 220px; height: 40px;

    display: flex;             /* its children now sit in a row */
    gap: 20px;                 /* space between them            */
    justify-content: center;   /* where they sit along the row  */
    align-items: center;       /* where they sit across it      */
  }

  .row div { width: 40px; height: 24px; background: #6ee787 }  /* every child  */
  .row div:nth-child(even) { background: #ffd166 }             /* some of them */
</style>

<div class="row">
  <div></div><div></div><div></div><div></div>
</div>

<!-- Pick children by COUNTING them:
       :nth-child(2)       the 2nd only
       :nth-child(odd)     1st, 3rd, 5th ...
       :nth-child(even)    2nd, 4th, 6th ...
       :nth-child(3n)      3rd, 6th, 9th ...
       :nth-child(3n + 1)  1st, 4th, 7th ...

   Other useful switches:
       flex-direction: column          stack them downwards
       justify-content: space-between  first and last touch the edges
       align-items: flex-end           line them up on the bottom
       flex-wrap: wrap                 spill onto a new line when full
       align-content: flex-start       where those lines sit -->`, parts: []part{

		{title: "Row houses", target: `<style>
  .ground { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #24422f }
  .terrace {
    position: absolute;
    left: 10px; top: 60px;
    width: 280px; height: 110px;
    display: flex;
    justify-content: space-between;
  }
  .terrace > div { width: 48px; height: 110px; background: #c2705a }
  .terrace > div:nth-child(even) { background: #7a8fa6 }
  .roof { width: 48px; height: 10px; background: #2a1f1a }
  .win { width: 22px; height: 20px; margin: 16px auto 0; background: #ffd166 }
  .door { width: 18px; height: 34px; margin: 18px auto 0; background: #3f2e1e }
</style>

<div class="ground"></div>

<div class="terrace">
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
</div>`, scaffold: `<style>
  .ground { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #24422f }
  .house { position: absolute; left: 10px; top: 60px; width: 48px; height: 110px; background: #c2705a }
</style>

<div class="ground"></div>
<div class="house"></div>

<!-- the rest is yours to build. -->`},

		{title: "Crate stack", target: `<style>
  .pallet { position: absolute; left: 100px; top: 176px; width: 100px; height: 24px; background: #4a3a26 }
  .rope { position: absolute; left: 148px; top: 0; width: 4px; height: 14px; background: #7d857a }
  .hook { position: absolute; left: 138px; top: 14px; width: 24px; height: 10px; border-radius: 5px; background: #9aa196 }
  .stack {
    position: absolute;
    left: 100px; top: 24px;
    width: 100px; height: 152px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .stack div { width: 60px; height: 22px; background: #8a5a3c }
  .stack div:nth-child(odd) { width: 84px; background: #c2705a }
  .stack div:nth-child(3n) { background: #ffd166 }
</style>

<div class="pallet"></div>
<div class="rope"></div>
<div class="hook"></div>

<div class="stack">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>`, scaffold: `<style>
  .pallet { position: absolute; left: 100px; top: 176px; width: 100px; height: 24px; background: #4a3a26 }
  .hook { position: absolute; left: 138px; top: 14px; width: 24px; height: 10px; border-radius: 5px; background: #9aa196 }
</style>

<div class="pallet"></div>
<div class="hook"></div>

<!-- the rest is yours to build. -->`},

		{title: "The crowd", target: `<style>
  .stand { position: absolute; left: 0; top: 146px; width: 300px; height: 24px; background: #8a5a3c }
  .pitch { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #2c5e40 }
  .crowd {
    position: absolute;
    left: 15px; top: 60px;
    width: 270px; height: 86px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .fan { width: 30px; height: 86px }
  .fan .head { width: 20px; height: 20px; border-radius: 50%; margin: 0 auto; background: #e0b48c }
  .fan .body { width: 30px; height: 60px; margin-top: 6px; border-radius: 6px 6px 0 0; background: #6ee787 }
  .crowd .fan:nth-child(3n + 2) .body { background: #4cc9f0 }
  .crowd .fan:nth-child(3n) .body { background: #ff7b54 }
</style>

<div class="stand"></div>
<div class="pitch"></div>

<div class="crowd">
  <div class="fan"><div class="head"></div><div class="body"></div></div>
  <div class="fan"><div class="head"></div><div class="body"></div></div>
  <div class="fan"><div class="head"></div><div class="body"></div></div>
  <div class="fan"><div class="head"></div><div class="body"></div></div>
  <div class="fan"><div class="head"></div><div class="body"></div></div>
  <div class="fan"><div class="head"></div><div class="body"></div></div>
  <div class="fan"><div class="head"></div><div class="body"></div></div>
</div>`, scaffold: `<style>
  .pitch { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #2c5e40 }
</style>

<div class="pitch"></div>

<!-- the rest is yours to build. -->`},

		{title: "Vending machine", target: `<style>
  .cabinet { position: absolute; left: 60px; top: 20px; width: 180px; height: 170px; border-radius: 6px; background: #24384d }
  .keypad { position: absolute; left: 184px; top: 40px; width: 44px; height: 88px; background: #16283a }
  .coin { position: absolute; left: 196px; top: 140px; width: 20px; height: 6px; background: #ffd166 }
  .tray { position: absolute; left: 76px; top: 166px; width: 100px; height: 14px; background: #16283a }
  .shelf {
    position: absolute;
    left: 72px; top: 34px;
    width: 100px; height: 120px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 8px;
  }
  .shelf div { width: 28px; height: 22px; background: #ffd166 }
  .shelf div:nth-child(even) { background: #ff7b54 }
</style>

<div class="cabinet"></div>
<div class="keypad"></div>
<div class="coin"></div>
<div class="tray"></div>

<div class="shelf">
  <div></div><div></div><div></div>
  <div></div><div></div><div></div>
  <div></div><div></div><div></div>
  <div></div><div></div><div></div>
</div>`, scaffold: `<style>
  .cabinet { position: absolute; left: 60px; top: 20px; width: 180px; height: 170px; border-radius: 6px; background: #24384d }
</style>

<div class="cabinet"></div>

<!-- the rest is yours to build. -->`},

		{title: "Picket fence", target: `<style>
  .grass { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #24422f }
  .rail { position: absolute; left: 0; width: 300px; height: 8px; background: #8a5a3c }
  .high { top: 112px }
  .low { top: 146px }
  .fence {
    position: absolute;
    left: 0; top: 90px;
    width: 300px; height: 80px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 6px;
  }
  .fence div { width: 14px; height: 70px; border-radius: 7px 7px 0 0; background: #e9f5cd }
  .fence div:nth-child(even) { height: 58px }
  .fence div:nth-child(5n) { background: #ffd166 }
</style>

<div class="grass"></div>
<div class="rail high"></div>
<div class="rail low"></div>

<div class="fence">
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
</div>`, scaffold: `<style>
  .grass { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #24422f }
</style>

<div class="grass"></div>

<!-- the rest is yours to build. -->`},
	}},

	// Level 8 puts several flex containers in one scene; level 9 nests
	// them, rows inside a column; level 10 goes three levels deep and
	// is meant to take a strong student half an hour a part.
	{n: 8, name: "RUSH HOUR", bg: "#1a2a3c", example: `<!-- THE IDEA: a scene is made of STRIPS. Each strip is its own
     flex box from level 7, placed once. One scene, several boxes. -->

<style>
  .top, .bottom {
    position: absolute;
    left: 0; width: 300px; height: 30px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .top    { top: 40px }
  .bottom { top: 130px; align-items: flex-end }   /* each box has its own rules */

  .top div    { width: 20px; height: 20px; background: #6ee787 }
  .bottom div { width: 30px; height: 12px; background: #ffd166 }
</style>

<div class="top">
  <div></div><div></div><div></div>
</div>
<div class="bottom">
  <div></div><div></div><div></div><div></div>
</div>

<!-- How to attack a scene:
       1. Split the target into strips of repeated things.
       2. One box per strip: position it, then display: flex.
       3. Style one child, then use :nth-child for the odd ones out.

   New tools here:
       flex: 1                    this child takes the leftover space
       :first-child, :last-child  the two ends of a strip
       flex-direction: row-reverse  same strip, counted from the right -->`, parts: []part{

		{title: "Parking lot", target: `<style>
  .lot { position: absolute; left: 0; top: 20px; width: 300px; height: 160px; background: #2b3440 }
  .lines {
    position: absolute;
    left: 0; width: 300px; height: 56px;
    display: flex;
    justify-content: center;
    gap: 34px;
  }
  .lines div { width: 2px; background: #e9f5cd }
  .north { top: 24px }
  .south { top: 120px }
  .row {
    position: absolute;
    left: 0; width: 300px; height: 56px;
    display: flex;
    justify-content: center;
    gap: 12px;
  }
  .row.north { align-items: flex-start; padding-top: 4px; box-sizing: border-box }
  .row.south { align-items: flex-end; padding-bottom: 4px; box-sizing: border-box }
  .car {
    width: 24px; height: 40px;
    border-radius: 4px;
    background: #4cc9f0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .car div { width: 16px; height: 8px; margin-top: 6px; background: #16283a }
  .south .car { align-items: flex-end }
  .south .car div { margin-bottom: 6px }
  .car:nth-child(even) { background: #ff7b54 }
  .car:nth-child(3n) { background: #ffd166 }
  .dashes {
    position: absolute;
    left: 0; top: 97px;
    width: 300px; height: 6px;
    display: flex;
    justify-content: center;
    gap: 12px;
  }
  .dashes div { width: 20px; background: #ffd166 }
</style>

<div class="lot"></div>

<div class="lines north">
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
</div>
<div class="lines south">
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
</div>

<div class="row north">
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
</div>
<div class="row south">
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
  <div class="car"><div></div></div>
</div>

<div class="dashes">
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
</div>`, scaffold: `<style>
  .lot { position: absolute; left: 0; top: 20px; width: 300px; height: 160px; background: #2b3440 }
</style>

<div class="lot"></div>

<!-- the rest is yours to build. -->`},

		{title: "Garden beds", target: `<style>
  .clouds {
    position: absolute;
    left: 30px; top: 14px;
    width: 240px; height: 24px;
    display: flex;
    justify-content: space-between;
  }
  .cloud { display: flex; align-items: flex-end }
  .cloud div { width: 16px; height: 16px; border-radius: 50%; background: #e9f5cd }
  .cloud div:nth-child(2) { width: 24px; height: 24px }
  .soil { position: absolute; left: 0; top: 150px; width: 300px; height: 50px; background: #3f2e1e }
  .flowers {
    position: absolute;
    left: 10px; top: 60px;
    width: 280px; height: 90px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .flower { display: flex; flex-direction: column; align-items: center }
  .head { width: 16px; height: 16px; border-radius: 50%; background: #f48fb1 }
  .stem { width: 4px; height: 60px; background: #3f8f57 }
  .flower:nth-child(even) .head { background: #ffd166 }
  .flower:nth-child(even) .stem { height: 40px }
  .flower:nth-child(3n) .head { background: #c792ea }
  .flower:nth-child(3n) .stem { height: 50px }
  .tufts {
    position: absolute;
    left: 0; top: 144px;
    width: 300px; height: 6px;
    display: flex;
    justify-content: center;
    gap: 4px;
  }
  .tufts div { width: 8px; border-radius: 4px 4px 0 0; background: #3f8f57 }
</style>

<div class="clouds">
  <div class="cloud"><div></div><div></div><div></div></div>
  <div class="cloud"><div></div><div></div><div></div></div>
  <div class="cloud"><div></div><div></div><div></div></div>
</div>

<div class="soil"></div>

<div class="flowers">
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
  <div class="flower"><div class="head"></div><div class="stem"></div></div>
</div>

<div class="tufts">
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
</div>`, scaffold: `<style>
  .soil { position: absolute; left: 0; top: 150px; width: 300px; height: 50px; background: #3f2e1e }
</style>

<div class="soil"></div>

<!-- the rest is yours to build. -->`},

		{title: "Keyboard", target: `<style>
  .case { position: absolute; left: 10px; top: 40px; width: 280px; height: 108px; border-radius: 8px; background: #2b3440 }
  .keys {
    position: absolute;
    left: 20px;
    width: 260px; height: 18px;
    display: flex;
    gap: 4px;
  }
  .keys div { width: 18px; background: #e9f5cd }
  .r1 { top: 52px }
  .r2 { top: 74px }
  .r3 { top: 96px }
  .r4 { top: 118px }
  .r1 div:first-child { background: #ff7b54 }
  .r1 div:nth-child(4n + 2) { background: #7a8fa6 }
  .r2 div:last-child { width: 40px; background: #ffd166 }
  .r3 div:first-child, .r3 div:last-child { width: 29px; background: #7a8fa6 }
  .r4 div { background: #7a8fa6 }
  .r4 div:nth-child(4) { flex: 1; background: #e9f5cd }
</style>

<div class="case"></div>

<div class="keys r1">
    <div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div><div></div>
</div>
<div class="keys r2">
    <div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
</div>
<div class="keys r3">
    <div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
</div>
<div class="keys r4">
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
</div>`, scaffold: `<style>
  .case { position: absolute; left: 10px; top: 40px; width: 280px; height: 108px; border-radius: 8px; background: #2b3440 }
</style>

<div class="case"></div>

<!-- the rest is yours to build. -->`},

		{title: "Laundry day", target: `<style>
  .grass { position: absolute; left: 0; top: 186px; width: 300px; height: 14px; background: #24422f }
  .poles {
    position: absolute;
    left: 0; top: 30px;
    width: 300px; height: 156px;
    display: flex;
    justify-content: space-between;
  }
  .poles div { width: 6px; background: #5f6b5c }
  .rope { position: absolute; left: 0; width: 300px; height: 2px; background: #9aa196 }
  .top { top: 40px }
  .bottom { top: 116px }
  .line {
    position: absolute;
    left: 0; width: 300px; height: 60px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 10px;
  }
  .line.top { top: 38px }
  .line.bottom { top: 114px; flex-direction: row-reverse }
  .shirt { width: 30px; height: 50px; background: #4cc9f0; display: flex; justify-content: center }
  .shirt div { width: 4px; height: 10px; margin-top: -4px; background: #8a5a3c }
  .shirt:nth-child(even) { width: 24px; height: 36px; background: #f48fb1 }
  .shirt:nth-child(3n) { width: 40px; height: 44px; background: #ffd166 }
</style>

<div class="grass"></div>

<div class="poles"><div></div><div></div></div>

<div class="rope top"></div>
<div class="rope bottom"></div>

<div class="line top">
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
</div>
<div class="line bottom">
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
  <div class="shirt"><div></div></div>
</div>`, scaffold: `<style>
  .grass { position: absolute; left: 0; top: 186px; width: 300px; height: 14px; background: #24422f }
</style>

<div class="grass"></div>

<!-- the rest is yours to build. -->`},

		{title: "Metro line", target: `<style>
  .lights {
    position: absolute;
    left: 0; top: 6px;
    width: 300px; height: 8px;
    display: flex;
    justify-content: center;
    gap: 12px;
  }
  .lights div { width: 16px; height: 8px; background: #ffd166 }
  .lights div:nth-child(odd) { background: #e9f5cd }
  .tunnel { position: absolute; left: 0; top: 60px; width: 300px; height: 80px; background: #16283a }
  .sleepers {
    position: absolute;
    left: 0; top: 122px;
    width: 300px; height: 12px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .sleepers div { width: 10px; height: 12px; background: #3f2e1e }
  .rail { position: absolute; left: 0; top: 126px; width: 300px; height: 4px; background: #7d857a }
  .platform { position: absolute; left: 0; top: 140px; width: 300px; height: 60px; background: #2b4a63 }
  .edge {
    position: absolute;
    left: 0; top: 140px;
    width: 300px; height: 6px;
    display: flex;
    justify-content: center;
    gap: 4px;
  }
  .edge div { width: 16px; height: 6px; background: #ffd166 }
  .benches {
    position: absolute;
    left: 0; top: 164px;
    width: 300px; height: 24px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 8px;
  }
  .benches div { width: 36px; height: 12px; background: #8a5a3c }
  .benches div:nth-child(even) { width: 10px; height: 18px; background: #7d857a }
  .train {
    position: absolute;
    left: 150px; top: 64px;
    width: 136px; height: 24px;
    border-radius: 4px 10px 10px 4px;
    background: #e9f5cd;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
  }
  .train div { width: 14px; height: 10px; background: #16283a }
  .train div:nth-child(3n) { background: #4cc9f0 }
  .line {
    position: absolute;
    left: 6px; top: 92px;
    width: 288px; height: 20px;
    display: flex;
    align-items: center;
  }
  .line div { flex: 1; height: 8px; background: #4cc9f0 }
  .line div:nth-child(even) { flex: none; width: 16px; height: 16px; border-radius: 50%; background: #e9f5cd }
  .line div:nth-child(3) { flex: 2 }
</style>

<div class="lights">
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
</div>

<div class="tunnel"></div>

<div class="sleepers">
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
</div>
<div class="rail"></div>

<div class="platform"></div>
<div class="edge">
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div><div></div>
</div>

<div class="benches">
  <div></div><div></div><div></div><div></div><div></div>
  <div></div><div></div><div></div><div></div>
</div>

<div class="train">
  <div></div><div></div><div></div><div></div><div></div><div></div>
</div>

<div class="line">
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
  <div></div>
</div>`, scaffold: `<style>
  .tunnel { position: absolute; left: 0; top: 60px; width: 300px; height: 80px; background: #16283a }
</style>

<div class="tunnel"></div>

<!-- the rest is yours to build. -->`},
	}},

	{n: 9, name: "BOXES IN BOXES", bg: "#14202e", example: `<!-- THE IDEA: a child can be a flex box too. Put boxes INSIDE a box,
     and only the outer one is ever placed. -->

<style>
  .grid {                        /* the only thing with left/top */
    position: absolute;
    left: 100px; top: 50px;
    width: 100px; height: 100px;
    display: flex;
    flex-direction: column;      /* its children (the rows) stack down */
    gap: 4px;
  }
  .grid > div {                  /* each row is ALSO a flex box */
    flex: 1;                     /* rows share the height evenly */
    display: flex;               /* its children sit side by side */
    gap: 4px;
  }
  .grid > div > div { flex: 1; background: #6ee787 }   /* the squares */
  .grid > div:nth-child(2) > div { background: #ffd166 }
</style>

<div class="grid">
  <div><div></div><div></div><div></div></div>
  <div><div></div><div></div><div></div></div>
  <div><div></div><div></div><div></div></div>
</div>

<!-- Two selectors matter now:
       .grid > div        DIRECT children only (the rows)
       .grid div          EVERY div inside, at any depth - often too much

   Count at two levels at once:
       .grid > div:nth-child(2) > div   every square in the 2nd row
       .grid > div > div:nth-child(2)   the 2nd square of every row

   Also: box-sizing: border-box keeps padding INSIDE a width. -->`, parts: []part{

		{title: "Apartment block", target: `<style>
  .ground { position: absolute; left: 0; top: 190px; width: 300px; height: 10px; background: #24422f }
  .ledge { position: absolute; left: 62px; top: 14px; width: 176px; height: 8px; background: #2b3440 }
  .building {
    position: absolute;
    left: 70px; top: 22px;
    width: 160px; height: 168px;
    box-sizing: border-box;
    padding: 10px;
    background: #3a5068;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .floor {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .floor div { width: 20px; height: 22px; background: #ffd166 }
  .floor div:nth-child(even) { background: #16283a }
  .floor:nth-child(odd) div:nth-child(3) { background: #4cc9f0 }
  .floor:last-child { align-items: flex-end }
  .floor:last-child div:nth-child(3) { width: 24px; height: 34px; background: #3f2e1e }
</style>

<div class="ground"></div>
<div class="ledge"></div>

<div class="building">
  <div class="floor"><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div></div>
</div>`, scaffold: `<style>
  .ground { position: absolute; left: 0; top: 190px; width: 300px; height: 10px; background: #24422f }
</style>

<div class="ground"></div>

<!-- the rest is yours to build. -->`},

		{title: "Egg carton", target: `<style>
  .table { position: absolute; left: 0; top: 160px; width: 300px; height: 40px; background: #3f2e1e }
  .carton {
    position: absolute;
    left: 31px; top: 50px;
    width: 238px; height: 110px;
    box-sizing: border-box;
    padding: 8px;
    border-radius: 6px 6px 0 0;
    background: #b08b5a;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row { flex: 1; display: flex; gap: 6px }
  .cup {
    flex: 1;
    border-radius: 8px;
    background: #8a6a44;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .cup div { width: 20px; height: 26px; border-radius: 50%; background: #f3ead8 }
  .cup:nth-child(3n) div { background: #d9a066 }
  .row:nth-child(2) .cup:nth-child(odd) div { background: #d9a066 }
</style>

<div class="table"></div>

<div class="carton">
  <div class="row">
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
  </div>
  <div class="row">
    <div class="cup"><div></div></div>
    <div class="cup"></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"></div>
    <div class="cup"><div></div></div>
  </div>
</div>`, scaffold: `<style>
  .table { position: absolute; left: 0; top: 160px; width: 300px; height: 40px; background: #3f2e1e }
</style>

<div class="table"></div>

<!-- the rest is yours to build. -->`},

		{title: "Chessboard", target: `<style>
  .board {
    position: absolute;
    left: 70px; top: 20px;
    width: 160px; height: 160px;
    box-sizing: border-box;
    padding: 8px;
    background: #3f2e1e;
    display: flex;
    flex-direction: column;
  }
  .row { flex: 1; display: flex }
  .row > div {
    flex: 1;
    background: #e9d8b4;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .row > div:nth-child(even) { background: #8a5a3c }
  .row:nth-child(even) > div { background: #8a5a3c }
  .row:nth-child(even) > div:nth-child(even) { background: #e9d8b4 }
  .row > div > div { width: 8px; height: 8px; border-radius: 50%; background: #16283a }
  .row:nth-child(n + 5) > div > div { background: #f3ead8 }
  .row:first-child > div > div, .row:last-child > div > div { width: 10px; height: 12px; border-radius: 2px }
</style>

<div class="board">
  <div class="row"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div>
  <div class="row"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div>
  <div class="row"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="row"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="row"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="row"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="row"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div>
  <div class="row"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div>
</div>`, scaffold: `<style>
  .board { position: absolute; left: 70px; top: 20px; width: 160px; height: 160px; background: #3f2e1e }
</style>

<div class="board"></div>

<!-- the rest is yours to build. -->`},

		{title: "Calendar", target: `<style>
  .page {
    position: absolute;
    left: 39px; top: 14px;
    width: 222px; height: 172px;
    background: #e9f5cd;
    display: flex;
    flex-direction: column;
  }
  .header {
    height: 30px;
    background: #ff7b54;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 100px;
  }
  .header div { width: 10px; height: 10px; border-radius: 50%; background: #16283a }
  .weeks {
    flex: 1;
    box-sizing: border-box;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .week { flex: 1; display: flex; gap: 4px }
  .week div { flex: 1; background: #c7d3b4 }
  .week div:nth-child(n + 6) { background: #f48fb1 }
  .week:first-child div:nth-child(-n + 2) { background: none }
  .week:nth-child(3) div:nth-child(4) { background: #4cc9f0 }
</style>

<div class="page">
  <div class="header"><div></div><div></div></div>
  <div class="weeks">
    <div class="week"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
    <div class="week"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
    <div class="week"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
    <div class="week"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
    <div class="week"><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
  </div>
</div>`, scaffold: `<style>
  .page { position: absolute; left: 39px; top: 14px; width: 222px; height: 172px; background: #e9f5cd }
</style>

<div class="page"></div>

<!-- the rest is yours to build. -->`},

		{title: "Freight train", target: `<style>
  .ground { position: absolute; left: 0; top: 174px; width: 300px; height: 26px; background: #24422f }
  .rail { position: absolute; left: 0; top: 170px; width: 300px; height: 4px; background: #9aa196 }
  .train {
    position: absolute;
    left: 0; top: 80px;
    width: 300px; height: 90px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 4px;
  }
  .wagon { width: 64px; display: flex; flex-direction: column }
  .body {
    height: 50px;
    background: #4cc9f0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
  }
  .body div { width: 10px; height: 14px; background: #16283a }
  .wagon:nth-child(even) .body { background: #ff7b54 }
  .wagon:first-child .body { height: 66px; border-radius: 10px 0 0 0; background: #ffd166 }
  .wagon:first-child .body div { height: 24px }
  .wheels {
    height: 14px;
    padding: 0 6px;
    display: flex;
    justify-content: space-between;
  }
  .wheels div { width: 14px; border-radius: 50%; background: #7d857a }
</style>

<div class="ground"></div>
<div class="rail"></div>

<div class="train">
  <div class="wagon">
    <div class="body"><div></div><div></div></div>
    <div class="wheels"><div></div><div></div></div>
  </div>
  <div class="wagon">
    <div class="body"><div></div><div></div><div></div><div></div></div>
    <div class="wheels"><div></div><div></div></div>
  </div>
  <div class="wagon">
    <div class="body"><div></div><div></div><div></div><div></div></div>
    <div class="wheels"><div></div><div></div></div>
  </div>
  <div class="wagon">
    <div class="body"><div></div><div></div><div></div><div></div></div>
    <div class="wheels"><div></div><div></div></div>
  </div>
</div>`, scaffold: `<style>
  .rail { position: absolute; left: 0; top: 170px; width: 300px; height: 4px; background: #9aa196 }
</style>

<div class="rail"></div>

<!-- the rest is yours to build. -->`},
	}},

	{n: 10, name: "THE BIG BUILD", bg: "#0f1a26", example: `<!-- THE IDEA: same as level 9, one level deeper. Boxes in boxes in
     boxes. Solve it from the outside in. -->

<style>
  .deck {                               /* level 1: placed once */
    position: absolute;
    left: 0; top: 60px;
    width: 300px; height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
  }
  .card {                               /* level 2: a column of rows */
    padding: 6px;
    background: #16283a;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .card > div { display: flex; gap: 4px }            /* level 3: a row */
  .card > div > div { width: 10px; height: 10px; background: #6ee787 }
  .card:nth-child(even) > div:nth-child(2) > div { background: #ffd166 }
</style>

<div class="deck">
  <div class="card">
    <div><div></div><div></div><div></div></div>
    <div><div></div><div></div><div></div></div>
  </div>
  <div class="card">
    <div><div></div><div></div><div></div></div>
    <div><div></div><div></div><div></div></div>
  </div>
  <div class="card">
    <div><div></div><div></div><div></div></div>
    <div><div></div><div></div><div></div></div>
  </div>
</div>

<!-- How to attack it:
       1. Find the biggest box and its direction (row or column).
       2. Inside it, find the repeated box. Repeat step 1 for it.
       3. Only style colours once the layout is right.

   The yellow rule above reads, right to left:
       squares  >  of the 2nd row  >  of every even card -->`, parts: []part{

		{title: "City skyline", target: `<style>
  .scene {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    display: flex;
    flex-direction: column;
  }
  .sky {
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 20px;
  }
  .sky div { width: 4px; height: 4px; margin-top: 4px; background: #e9f5cd }
  .sky div:nth-child(odd) { margin-top: 16px }
  .sky div:nth-child(3n) { width: 6px; height: 6px; margin-top: 30px; background: #ffd166 }
  .city {
    height: 120px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 4px;
  }
  .tower { display: flex; flex-direction: column; align-items: center }
  .cap { width: 12px; height: 8px; background: #2b4a63 }
  .body {
    box-sizing: border-box;
    padding: 6px;
    background: #16283a;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 4px;
  }
  .body div { width: 8px; height: 8px; background: #ffd166 }
  .tower:nth-child(even) .body div:nth-child(odd) { background: #4cc9f0 }
  .body div:nth-child(5n) { background: #24384d }
  .tower:nth-child(3n + 1) .body { width: 44px; height: 92px }
  .tower:nth-child(3n + 2) .body { width: 56px; height: 68px }
  .tower:nth-child(3n) .body { width: 32px; height: 104px }
  .tower:nth-child(3n) .cap { width: 4px; height: 14px; background: #ff7b54 }
  .road {
    height: 30px;
    background: #1d3550;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
  }
  .road div { width: 18px; height: 3px; background: #e9f5cd }
</style>

<div class="scene">
  <div class="sky">
    <div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>

  <div class="city">
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div>
      </div>
    </div>
  </div>

  <div class="road">
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`, scaffold: `<style>
  .road { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #1d3550 }
</style>

<div class="road"></div>

<!-- the rest is yours to build. -->`},

		{title: "Stadium night", target: `<style>
  .scene {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    display: flex;
    flex-direction: column;
  }
  .sky {
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 50px;
  }
  .rig { width: 22px; display: flex; flex-wrap: wrap; gap: 2px }
  .rig div { width: 6px; height: 6px; background: #ffd166 }
  .rig div:nth-child(even) { background: #e9f5cd }
  .stand {
    height: 100px;
    background: #1d3550;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
  }
  .tier { padding: 3px 6px; background: #16283a; display: flex; gap: 3px }
  .tier div { width: 10px; height: 10px; background: #4cc9f0 }
  .tier div:nth-child(even) { background: #e9f5cd }
  .tier:nth-child(even) div:nth-child(4n) { background: #ff7b54 }
  .pitch { height: 60px; display: flex }
  .pitch > div {
    flex: 1;
    box-sizing: border-box;
    background: #2c5e40;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .pitch > div:nth-child(even) { background: #235838 }
  .pitch > div:nth-child(3n) { align-items: flex-start; padding-top: 10px }
  .pitch > div:nth-child(3n + 1) { align-items: flex-end; padding-bottom: 10px }
  .pitch div div { width: 8px; height: 8px; border-radius: 50%; background: #ff7b54 }
  .pitch > div:nth-child(n + 6) div { background: #4cc9f0 }
</style>

<div class="scene">
  <div class="sky">
    <div class="rig"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    <div class="rig"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    <div class="rig"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    <div class="rig"><div></div><div></div><div></div><div></div><div></div><div></div></div>
  </div>

  <div class="stand">
    <div class="tier">
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      <div></div><div></div><div></div>
    </div>
    <div class="tier">
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      <div></div><div></div><div></div><div></div><div></div>
    </div>
    <div class="tier">
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
    </div>
    <div class="tier">
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
    </div>
  </div>

  <div class="pitch">
    <div><div></div></div>
    <div><div></div></div>
    <div><div></div></div>
    <div><div></div></div>
    <div><div></div></div>
    <div><div></div></div>
    <div><div></div></div>
    <div><div></div></div>
    <div><div></div></div>
    <div><div></div></div>
  </div>
</div>`, scaffold: `<style>
  .stand { position: absolute; left: 0; top: 40px; width: 300px; height: 100px; background: #1d3550 }
  .pitch { position: absolute; left: 0; top: 140px; width: 300px; height: 60px; background: #2c5e40 }
</style>

<div class="stand"></div>
<div class="pitch"></div>

<!-- the rest is yours to build. -->`},

		{title: "Bookshelf", target: `<style>
  .case {
    position: absolute;
    left: 20px; top: 10px;
    width: 260px; height: 180px;
    box-sizing: border-box;
    padding: 6px;
    background: #3f2e1e;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .shelf {
    flex: 1;
    padding: 0 6px;
    background: #24180f;
    display: flex;
    align-items: flex-end;
    gap: 3px;
  }
  .shelf:nth-child(2) { flex-direction: row-reverse }
  .book {
    width: 18px; height: 44px;
    box-sizing: border-box;
    padding: 5px 0;
    background: #c2705a;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .book div { height: 3px; background: #ffd166 }
  .book:nth-child(3n + 2) { height: 38px; background: #4cc9f0 }
  .book:nth-child(3n) { width: 14px; height: 48px; background: #6ee787 }
  .book:nth-child(4n) { height: 30px }
  .book:nth-child(4n) div { background: #e9f5cd }
  .pot { margin-left: auto; width: 24px; height: 20px; border-radius: 0 0 6px 6px; background: #8a5a3c }
</style>

<div class="case">
  <div class="shelf">
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="pot"></div>
  </div>
  <div class="shelf">
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="pot"></div>
  </div>
  <div class="shelf">
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="book"><div></div><div></div></div>
    <div class="pot"></div>
  </div>
</div>`, scaffold: `<style>
  .case { position: absolute; left: 20px; top: 10px; width: 260px; height: 180px; background: #3f2e1e }
</style>

<div class="case"></div>

<!-- the rest is yours to build. -->`},

		{title: "Circuit board", target: `<style>
  .board {
    position: absolute;
    left: 0; top: 0;
    width: 300px; height: 200px;
    background: #123024;
    display: flex;
    flex-direction: column;
  }
  .traces {
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .traces > div { display: flex; flex-direction: column; gap: 3px }
  .traces div div { width: 30px; height: 3px; background: #6ee787 }
  .traces > div:nth-child(even) div { background: #3f8f57 }
  .traces > div:nth-child(3n) div:nth-child(2) { width: 20px }
  .chips {
    height: 120px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: center;
    gap: 8px 20px;
  }
  .chip { display: flex; align-items: center; gap: 2px }
  .pins { display: flex; flex-direction: column; gap: 4px }
  .pins div { width: 6px; height: 4px; background: #9aa196 }
  .core {
    width: 52px; height: 52px;
    box-sizing: border-box;
    padding: 7px;
    background: #0b1a12;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: center;
    gap: 4px;
  }
  .core div { width: 10px; height: 10px; background: #ffd166 }
  .core div:nth-child(even) { background: #ff7b54 }
  .core div:nth-child(5) { background: #4cc9f0 }
  .chip:nth-child(even) .core { background: #16283a }
  .chip:nth-child(even) .core div:nth-child(odd) { background: #6ee787 }
  .leds {
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .leds div { width: 8px; height: 8px; border-radius: 50%; background: #6ee787 }
  .leds div:nth-child(3n) { background: #ff7b54 }
</style>

<div class="board">
  <div class="traces">
    <div><div></div><div></div><div></div></div>
    <div><div></div><div></div><div></div></div>
    <div><div></div><div></div><div></div></div>
    <div><div></div><div></div><div></div></div>
    <div><div></div><div></div><div></div></div>
    <div><div></div><div></div><div></div></div>
  </div>

  <div class="chips">
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div><div></div><div></div></div>
    </div>
  </div>

  <div class="leds">
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`, scaffold: `<style>
  .board { position: absolute; left: 0; top: 0; width: 300px; height: 200px; background: #123024 }
</style>

<div class="board"></div>

<!-- the rest is yours to build. -->`},

		{title: "The quilt", target: `<style>
  .quilt {
    position: absolute;
    left: 22px; top: 18px;
    width: 256px; height: 164px;
    box-sizing: border-box;
    padding: 4px;
    background: #3f2e1e;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .row { flex: 1; display: flex; gap: 4px }
  .patch {
    flex: 1;
    box-sizing: border-box;
    padding: 3px;
    background: #e9f5cd;
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .patch div { width: 15px; height: 14px; background: #c2705a }
  .patch div:nth-child(2), .patch div:nth-child(3) { background: #ffd166 }
  .patch:nth-child(even) div { background: #4cc9f0 }
  .patch:nth-child(even) div:nth-child(2), .patch:nth-child(even) div:nth-child(3) { background: #16283a }
  .row:nth-child(even) .patch div { border-radius: 50% }
  .row:nth-child(even) .patch:nth-child(odd) { background: #6ee787 }
  .row:nth-child(3n) .patch:nth-child(3n) { background: #ff7b54 }
</style>

<div class="quilt">
  <div class="row">
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
  </div>
  <div class="row">
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
  </div>
  <div class="row">
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
  </div>
  <div class="row">
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
    <div class="patch"><div></div><div></div><div></div><div></div></div>
  </div>
</div>`, scaffold: `<style>
  .quilt { position: absolute; left: 22px; top: 18px; width: 256px; height: 164px; background: #3f2e1e }
</style>

<div class="quilt"></div>

<!-- the rest is yours to build. -->`},
	}},
}
