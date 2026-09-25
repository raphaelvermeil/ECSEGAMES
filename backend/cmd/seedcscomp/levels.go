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
			{65, 55, 10, 95, "#e9f5cd", "", ""},
			{225, 55, 10, 95, "#e9f5cd", "", ""},
			{65, 55, 170, 10, "#e9f5cd", "", ""},
		}},
		{title: "Scoreboard", rects: []rect{
			{40, 45, 220, 110, "#0b1310", "", ""},
			{55, 60, 80, 25, "#6ee787", "", ""},
			{55, 95, 120, 15, "#3f8f57", "", ""},
			{55, 120, 60, 10, "#2c5e40", "", ""},
		}},
		{title: "Cinder track", rects: []rect{
			{0, 120, 300, 80, "#8a5a3c", "", ""},
			{0, 145, 300, 5, "#e9f5cd", "", ""},
			{0, 175, 300, 5, "#e9f5cd", "", ""},
		}},
		{title: "Team flag", rects: []rect{
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{40, 40, 10, 140, "#9aa196", "", ""},
			{50, 45, 90, 50, "#6ee787", "", ""},
			{50, 65, 90, 10, "#0b1310", "", ""},
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
			{130, 130, 40, 50, "#1b2a20", "4px 4px 0 0", ""},
			{145, 55, 5, 45, "#9aa196", "", ""},
			{150, 55, 40, 20, "#ffd166", "", ""},
		}},
		{title: "Bonfire", rects: []rect{
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{95, 170, 110, 10, "#5a4632", "5px", ""},
			{95, 160, 110, 10, "#3f2e1e", "5px", "transform:rotate(-8deg)"},
			{130, 105, 40, 65, "#ff7b54", "", "border-radius:20px 20px 5px 5px"},
			{140, 125, 20, 45, "#ffd166", "", "border-radius:10px 10px 5px 5px"},
		}},
		{title: "Bench and tree", rects: []rect{
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{40, 150, 120, 10, "#8a5a3c", "", ""},
			{45, 160, 10, 20, "#5f6b5c", "", ""},
			{145, 160, 10, 20, "#5f6b5c", "", ""},
			{220, 120, 10, 60, "#4a3a26", "", ""},
			{195, 70, 60, 60, "#235838", "25px", ""},
		}},
		{title: "Match ball", rects: []rect{
			{0, 150, 300, 50, "#2c5e40", "", ""},
			{0, 185, 300, 5, "#e9f5cd", "", ""},
			{120, 145, 60, 10, "rgba(0,0,0,.35)", "50%", ""},
			{120, 85, 60, 60, "#e9f5cd", "30px", ""},
			{140, 105, 20, 20, "#0b1310", "5px", "transform:rotate(45deg)"},
		}},
	}},
	{n: 3, name: "GOLDEN HOUR", bg: "#142a33", parts: []part{
		{title: "Sailboat", rects: []rect{
			{0, 140, 300, 60, "#2f6f8f", "", ""},
			{40, 35, 40, 40, "#ffd98a", "20px", ""},
			{100, 125, 100, 20, "#8a5a3c", "0 0 20px 20px", ""},
			{150, 50, 5, 75, "#e9f5cd", "", ""},
			{105, 55, 45, 70, "#e9f5cd", "", "clip-path:polygon(100% 0,100% 100%,0 100%)"},
			{155, 55, 45, 70, "#ffd98a", "", "clip-path:polygon(0 0,100% 100%,0 100%)"},
			{0, 150, 300, 5, "rgba(233,245,205,.35)", "", ""},
		}},
		{title: "Ice cream", rects: []rect{
			{100, 175, 100, 10, "#9aa196", "5px", ""},
			{125, 120, 50, 60, "#c98a4b", "", "clip-path:polygon(0 0,100% 0,50% 100%)"},
			{120, 80, 60, 60, "#ff7b54", "30px", ""},
			{135, 60, 30, 30, "#e9f5cd", "15px", ""},
			{140, 45, 20, 20, "#c1121f", "10px", ""},
			{150, 35, 5, 10, "#3f8f57", "", ""},
		}},
		{title: "Windmill", rects: []rect{
			{0, 170, 300, 30, "#2c5e40", "", ""},
			{135, 50, 30, 120, "#e9f5cd", "4px 4px 0 0", ""},
			{140, 125, 20, 20, "#4a3a26", "2px", ""},
			{145, 20, 10, 100, "#5a4632", "", "transform:rotate(22.5deg)"},
			{145, 20, 10, 100, "#5a4632", "", "transform:rotate(67.5deg)"},
			{145, 20, 10, 100, "#5a4632", "", "transform:rotate(112.5deg)"},
			{145, 20, 10, 100, "#5a4632", "", "transform:rotate(157.5deg)"},
			{140, 60, 20, 20, "#0b1310", "10px", ""},
		}},
		{title: "Letter home", rects: []rect{
			{70, 70, 160, 100, "#e9f5cd", "4px", ""},
			{70, 165, 160, 5, "rgba(0,0,0,.3)", "", ""},
			{70, 70, 160, 60, "#c6d6c0", "", "clip-path:polygon(0 0,100% 0,50% 100%)"},
			{195, 80, 20, 25, "#ff7b54", "2px", ""},
			{85, 140, 80, 5, "#9aa196", "", ""},
			{85, 150, 50, 5, "#9aa196", "", ""},
			{200, 140, 20, 20, "#3f8f57", "10px", ""},
		}},
		{title: "Balloon ride", rects: []rect{
			{0, 170, 300, 30, "#2c5e40", "", ""},
			{120, 40, 60, 75, "#ff7b54", "50% 50% 45% 45%", ""},
			{145, 40, 10, 75, "#ffd166", "", ""},
			{135, 110, 5, 15, "#5a4632", "", "transform:rotate(-18deg)"},
			{160, 110, 5, 15, "#5a4632", "", "transform:rotate(18deg)"},
			{140, 125, 20, 15, "#8a5a3c", "3px", ""},
			{40, 60, 55, 15, "#e9f5cd", "8px", ""},
			{205, 95, 40, 10, "#e9f5cd", "5px", ""},
		}},
	}},
	{n: 4, name: "SCUNTS", bg: "#0f1512", parts: []part{
		{title: "Boombox", rects: []rect{
			{0, 175, 300, 25, "#1d3a2f", "", ""},
			{60, 90, 180, 85, "#9aa196", "8px", ""},
			{210, 45, 5, 45, "#9aa196", "2px", "transform:rotate(25deg)"},
			{125, 70, 50, 10, "#7d857a", "5px", ""},
			{130, 75, 5, 15, "#7d857a", "", ""},
			{165, 75, 5, 15, "#7d857a", "", ""},
			{80, 105, 50, 50, "#7d857a", "25px", ""},
			{90, 115, 30, 30, "#0b1310", "15px", ""},
			{170, 105, 50, 50, "#7d857a", "25px", ""},
			{180, 115, 30, 30, "#0b1310", "15px", ""},
			{135, 100, 30, 35, "#4cc9f0", "3px", ""},
			{135, 145, 10, 10, "#ffd166", "5px", ""},
			{155, 145, 10, 10, "#ff7b54", "5px", ""},
		}},
		{title: "Trophy", rects: []rect{
			{0, 175, 300, 25, "#1d3a2f", "", ""},
			{110, 60, 80, 60, "#ffd166", "6px 6px 40px 40px", ""},
			{110, 60, 80, 10, "#e9f5cd", "6px 6px 0 0", ""},
			{90, 70, 30, 30, "", "15px", "border:5px solid #ffd166"},
			{170, 70, 30, 30, "", "15px", "border:5px solid #ffd166"},
			{120, 75, 10, 25, "rgba(233,245,205,.45)", "5px", ""},
			{140, 80, 20, 20, "#ff7b54", "2px", "transform:rotate(45deg)"},
			{140, 115, 20, 35, "#ffd166", "", ""},
			{120, 150, 60, 10, "#9aa196", "2px", ""},
			{110, 160, 80, 15, "#7d857a", "3px", ""},
			{135, 165, 30, 5, "#0b1310", "2px", ""},
		}},
		{title: "Arcade cabinet", rects: []rect{
			{95, 180, 110, 10, "rgba(0,0,0,.45)", "", ""},
			{90, 30, 120, 150, "#1a2c22", "6px", ""},
			{105, 35, 90, 10, "#6ee787", "", ""},
			{105, 50, 90, 60, "#0b1310", "2px", ""},
			{110, 55, 80, 50, "#4cc9f0", "2px", ""},
			{105, 115, 90, 25, "#243c2e", "3px", ""},
			{115, 120, 15, 15, "#ffd166", "8px", ""},
			{140, 120, 15, 15, "#ff7b54", "8px", ""},
			{170, 115, 5, 20, "#e9f5cd", "3px", ""},
			{165, 110, 15, 10, "#c1121f", "5px", ""},
		}},
		{title: "Rocket", rects: []rect{
			{95, 180, 110, 10, "#5f6b5c", "", ""},
			{135, 40, 30, 20, "#ff7b54", "15px 15px 0 0", ""},
			{135, 55, 30, 80, "#e9f5cd", "4px 4px 4px 4px", ""},
			{140, 70, 20, 20, "#4cc9f0", "10px", ""},
			{115, 110, 20, 25, "#ff7b54", "", "clip-path:polygon(100% 0,100% 100%,0 100%)"},
			{165, 110, 20, 25, "#ff7b54", "", "clip-path:polygon(0 0,100% 100%,0 100%)"},
			{140, 135, 20, 35, "#ffd166", "6px 6px 12px 12px", ""},
			{145, 140, 10, 20, "#ff7b54", "4px 4px 8px 8px", ""},
			{110, 170, 40, 15, "rgba(233,245,205,.45)", "8px", ""},
			{160, 170, 35, 15, "rgba(233,245,205,.3)", "8px", ""},
		}},
		{title: "Robot mascot", rects: []rect{
			{0, 175, 300, 25, "#1d3a2f", "", ""},
			{140, 15, 20, 20, "#ff7b54", "10px", ""},
			{145, 30, 10, 15, "#e9f5cd", "", ""},
			{110, 45, 80, 60, "#9aa196", "6px", ""},
			{125, 60, 20, 20, "#4cc9f0", "10px", ""},
			{155, 60, 20, 20, "#4cc9f0", "10px", ""},
			{130, 90, 40, 5, "#0b1310", "3px", ""},
			{105, 110, 90, 60, "#7d857a", "6px", ""},
			{85, 120, 20, 40, "#9aa196", "4px", ""},
			{195, 120, 20, 40, "#9aa196", "4px", ""},
			{125, 125, 50, 20, "#243c2e", "3px", ""},
		}},
	}},
	{n: 5, name: "AFTER DARK", bg: "#0b1310", parts: []part{
		// The tree and the bench both used to straddle the track band, so the
		// tree grew out of the running surface and the bench sat on it. Both
		// now stand on the near grass, in front of the track. The bench is a
		// real bench rather than a plank on two posts: back rail, two uprights,
		// a seat slab and two legs.
		{title: "The quad at golden hour", rects: []rect{
			{0, 0, 300, 95, "#2a3d4f", "", ""},
			{0, 95, 300, 10, "#d99a5b", "", ""},
			{0, 105, 300, 95, "#2c5e40", "", ""},
			{200, 35, 40, 40, "#ffd98a", "20px", "box-shadow:0 0 0 10px #50595a"},
			{0, 115, 300, 20, "#8a5a3c", "", ""},
			{50, 135, 10, 40, "#4a3a26", "", ""},
			{30, 100, 50, 45, "#235838", "25px", ""},
			{190, 135, 60, 5, "#8a5a3c", "", ""},
			{195, 140, 5, 15, "#6b4228", "", ""},
			{240, 140, 5, 15, "#6b4228", "", ""},
			{185, 155, 70, 5, "#8a5a3c", "", ""},
			{190, 160, 5, 15, "#5f6b5c", "", ""},
			{245, 160, 5, 15, "#5f6b5c", "", ""},
			{85, 150, 90, 30, "#4cc9f0", "50%", ""},
			{95, 155, 30, 5, "#8bdbe2", "3px", ""},
			{15, 180, 35, 15, "#7d857a", "12px 12px 4px 4px", ""},
		}},
		{title: "Night skyline", rects: []rect{
			{0, 150, 300, 50, "#101a15", "", ""},
			{235, 30, 30, 30, "#e9f5cd", "15px", ""},
			{20, 80, 55, 70, "#182633", "", ""},
			{85, 50, 60, 100, "#14212c", "", ""},
			{155, 95, 55, 55, "#182633", "", ""},
			{220, 70, 50, 80, "#14212c", "", ""},
			{30, 95, 10, 15, "#ffd166", "", ""},
			{50, 95, 10, 15, "rgba(255,209,102,.45)", "", ""},
			{100, 70, 10, 15, "#ffd166", "", ""},
			{120, 70, 10, 15, "rgba(255,209,102,.5)", "", ""},
			{170, 110, 10, 15, "#ffd166", "", ""},
			{235, 90, 10, 15, "#ffd166", "", ""},
		}},
		// The wheel is one circle centred on (150,100) with an outer radius of
		// 65, and everything else is placed off that centre. The rim is 120x120
		// of content plus a 5px border, which is 130 across the border box, so
		// border-radius:65px makes it an exact circle. Get that arithmetic wrong
		// and the rim drifts off the hub.
		//
		// Each spoke is a full diameter rotated about its own centre, so four
		// rects give eight evenly spaced arms. Their half-length is 60, the rim's
		// inner radius, so they meet the ring. They are 5px wide on the 5px
		// grid, so they sit 2.5px right of true centre; the hub hides it.
		{title: "Ferris wheel", given: 4, rects: []rect{
			{0, 170, 300, 30, "#1d3a2f", "", ""},
			{145, 100, 10, 100, "#5f6b5c", "", "transform:rotate(-16deg);transform-origin:50% 0"},
			{145, 100, 10, 100, "#5f6b5c", "", "transform:rotate(16deg);transform-origin:50% 0"},
			{85, 35, 120, 120, "", "65px", "border:5px solid #6ee787"},
			{150, 40, 5, 120, "#3f8f57", "", ""},
			{150, 40, 5, 120, "#3f8f57", "", "transform:rotate(90deg)"},
			{150, 40, 5, 120, "#3f8f57", "", "transform:rotate(45deg)"},
			{150, 40, 5, 120, "#3f8f57", "", "transform:rotate(-45deg)"},
			{140, 90, 20, 20, "#e9f5cd", "10px", ""},
			{135, 25, 30, 20, "#ffd166", "3px", ""},
			{200, 90, 30, 20, "#ff7b54", "3px", ""},
			{135, 155, 30, 20, "#c792ea", "3px", ""},
			{70, 90, 30, 20, "#4cc9f0", "3px", ""},
		}},
		{title: "Terminal", rects: []rect{
			{35, 30, 230, 140, "#0d1712", "4px", "box-shadow:0 8px 0 rgba(0,0,0,.35)"},
			{35, 30, 230, 20, "#1a2c22", "4px 4px 0 0", ""},
			{45, 35, 10, 10, "#ff7b54", "5px", ""},
			{60, 35, 10, 10, "#ffd166", "5px", ""},
			{75, 35, 10, 10, "#6ee787", "5px", ""},
			{50, 60, 15, 10, "#3f8f57", "", ""},
			{70, 60, 110, 10, "#6ee787", "", ""},
			{50, 80, 15, 10, "#3f8f57", "", ""},
			{70, 80, 75, 10, "#c6d6c0", "", ""},
			{50, 100, 15, 10, "#3f8f57", "", ""},
			{70, 100, 140, 10, "#4cc9f0", "", ""},
			{50, 120, 15, 10, "#3f8f57", "", ""},
			{70, 120, 10, 10, "#e9f5cd", "0", ""},
		}},
		{title: "Boss", rects: []rect{
			{45, 45, 210, 110, "#6ee787", "8px", ""},
			{55, 55, 190, 90, "#0b1310", "5px", ""},
			{80, 75, 40, 40, "#ff7b54", "20px", ""},
			{180, 75, 40, 40, "#ff7b54", "20px", ""},
			{90, 85, 20, 20, "#0b1310", "10px", ""},
			{190, 85, 20, 20, "#0b1310", "10px", ""},
			{75, 60, 50, 10, "#e9f5cd", "5px", "transform:rotate(-12deg)"},
			{175, 60, 50, 10, "#e9f5cd", "5px", "transform:rotate(12deg)"},
			{95, 120, 110, 20, "#e9f5cd", "4px", ""},
			{115, 120, 10, 20, "#0b1310", "", ""},
			{145, 120, 10, 20, "#0b1310", "", ""},
			{175, 120, 10, 20, "#0b1310", "", ""},
			{0, 180, 300, 20, "#093325", "", ""},
		}},
	}},
	{n: 6, name: "THE LANDSCAPE", bg: "#233b52", parts: []part{
		{title: "Mount Royal at dawn", rects: []rect{
			{0, 0, 300, 65, "#3c4a5e", "", ""},
			{0, 65, 300, 35, "#6b5560", "", ""},
			{0, 100, 300, 20, "#a3695a", "", ""},
			{130, 70, 40, 40, "#ffd98a", "20px", "box-shadow:0 0 0 10px #836a67"},
			{15, 40, 150, 90, "#2c3e4f", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{130, 50, 140, 80, "#26364a", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{75, 40, 30, 20, "#e9f5cd", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{0, 120, 300, 30, "#1d3a2f", "", ""},
			{0, 145, 300, 35, "#2f6f8f", "", ""},
			{40, 155, 120, 5, "#8fb2ae", "", ""},
			{90, 165, 85, 5, "#5f93a0", "", ""},
			{0, 180, 300, 20, "#2c5e40", "", ""},
			{40, 155, 5, 25, "#4a3a26", "", ""},
			{30, 130, 25, 30, "#235838", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{250, 155, 5, 25, "#4a3a26", "", ""},
			{240, 135, 25, 25, "#235838", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
		}},
		{title: "Lakeside dusk", rects: []rect{
			{0, 0, 300, 70, "#2a3d4f", "", ""},
			{0, 70, 300, 25, "#7a5a68", "", ""},
			{0, 95, 300, 20, "#c2705a", "", ""},
			{195, 80, 30, 30, "#ffd98a", "15px", ""},
			{0, 110, 300, 15, "#16261f", "", ""},
			{0, 120, 300, 60, "#245a72", "", ""},
			{0, 130, 300, 5, "#4a6b6a", "", ""},
			{150, 130, 120, 5, "#a3906a", "", ""},
			{0, 180, 300, 20, "#1d3a2f", "", ""},
			{40, 140, 110, 10, "#5a4632", "", ""},
			{40, 150, 10, 30, "#4a3a26", "", ""},
			{140, 150, 10, 30, "#4a3a26", "", ""},
			{180, 150, 60, 15, "#8a5a3c", "0 0 15px 15px", ""},
			{195, 140, 10, 10, "#e9f5cd", "5px", ""},
			{215, 145, 25, 5, "#5a4632", "", "transform:rotate(-8deg)"},
			{60, 60, 45, 10, "#8fa3ae", "5px", ""},
		}},
		{title: "Winter campus", rects: []rect{
			{0, 0, 300, 110, "#2c4763", "", ""},
			{240, 25, 30, 30, "#e9f5cd", "15px", ""},
			{0, 110, 300, 90, "#dfe9ea", "", ""},
			{25, 60, 65, 50, "#1e2f3f", "3px 3px 0 0", ""},
			{25, 55, 65, 10, "#f4fbfb", "4px 4px 0 0", ""},
			{35, 70, 15, 15, "#ffd166", "", ""},
			{105, 40, 80, 70, "#182633", "4px 4px 0 0", ""},
			{105, 35, 80, 10, "#f4fbfb", "4px 4px 0 0", ""},
			{120, 50, 20, 20, "#ffd166", "", ""},
			{150, 50, 20, 20, "#6b6347", "", ""},
			{200, 65, 60, 45, "#1e2f3f", "3px 3px 0 0", ""},
			{200, 60, 60, 10, "#f4fbfb", "4px 4px 0 0", ""},
			{210, 75, 15, 20, "#ffd166", "", ""},
			{90, 120, 5, 40, "#3f2e1e", "", ""},
			{80, 95, 25, 35, "#1f5138", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{0, 165, 300, 5, "#f1f5f6", "", ""},
		}},
		{title: "River valley", rects: []rect{
			{0, 0, 300, 65, "#4a6c8c", "", ""},
			{35, 15, 40, 40, "#ffd98a", "20px", ""},
			{0, 65, 160, 50, "#3f6b4a", "", "clip-path:polygon(40% 0,100% 100%,0 100%)"},
			{140, 60, 160, 60, "#356043", "", "clip-path:polygon(55% 0,100% 100%,0 100%)"},
			{0, 110, 300, 90, "#2f6f8f", "", "clip-path:polygon(38% 0,60% 0,100% 100%,0 100%)"},
			{0, 110, 300, 90, "#2c5e40", "", "clip-path:polygon(0 0,38% 0,0 100%)"},
			{0, 110, 300, 90, "#357d43", "", "clip-path:polygon(60% 0,100% 0,100% 100%)"},
			{105, 130, 25, 5, "#8fb0b4", "", ""},
			{90, 155, 45, 5, "#6791a3", "", ""},
			{30, 120, 5, 20, "#4a3a26", "", ""},
			{20, 100, 25, 25, "#235838", "13px", ""},
			{235, 125, 5, 20, "#4a3a26", "", ""},
			{225, 105, 25, 25, "#235838", "13px", ""},
			{185, 80, 45, 10, "#9aa196", "2px", ""},
			{195, 90, 5, 15, "#5f6b5c", "", ""},
			{215, 90, 5, 15, "#5f6b5c", "", ""},
		}},
		{title: "Desert highway", rects: []rect{
			{0, 0, 300, 110, "#e2955f", "", ""},
			{0, 0, 300, 45, "#c2705a", "", ""},
			{125, 50, 50, 50, "#ffe0a3", "25px", "box-shadow:0 0 0 10px #e8a46d"},
			{0, 90, 110, 25, "#8a5a4c", "", "clip-path:polygon(50% 0,100% 100%,0 100%)"},
			{190, 85, 110, 30, "#7d5044", "", "clip-path:polygon(45% 0,100% 100%,0 100%)"},
			{0, 110, 300, 90, "#caa06e", "", ""},
			{0, 110, 300, 90, "#3a3a3e", "", "clip-path:polygon(44% 0,56% 0,84% 100%,16% 100%)"},
			{145, 115, 10, 15, "#f4fbfb", "", ""},
			{145, 140, 10, 20, "#f4fbfb", "", ""},
			{145, 170, 10, 25, "#f4fbfb", "", ""},
			{55, 120, 10, 45, "#2f6b45", "5px", ""},
			{45, 130, 10, 20, "#2f6b45", "5px", ""},
			{240, 125, 10, 50, "#2f6b45", "5px", ""},
			{230, 140, 10, 20, "#2f6b45", "5px", ""},
			{95, 105, 5, 25, "#5f6b5c", "", ""},
			{85, 95, 25, 10, "#9aa196", "2px", ""},
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
    left: 5px; top: 60px;
    width: 290px; height: 110px;
    display: flex;
    justify-content: space-between;
  }
  .terrace > div { width: 50px; height: 110px; background: #c2705a }
  .terrace > div:nth-child(even) { background: #7a8fa6 }
  .roof { width: 50px; height: 10px; background: #2a1f1a }
  .win { width: 20px; height: 20px; margin: 15px auto 0; background: #ffd166 }
  .door { width: 20px; height: 35px; margin: 20px auto 0; background: #3f2e1e }
</style>

<div class="ground"></div>

<div class="terrace">
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
  <div><div class="roof"></div><div class="win"></div><div class="door"></div></div>
</div>`, scaffold: `<style>
  .ground { position: absolute; left: 0; bottom: 0; width: 300px; height: 30px; background: #24422f }
  .house { position: absolute; left: 5px; bottom: 30px; width: 50px; height: 110px; background: #c2705a }
</style>

<div class="ground"></div>
<div class="house"></div>

<!-- the rest is yours to build. -->`},

		{title: "Crate stack", target: `<style>
  .pallet { position: absolute; left: 100px; top: 175px; width: 100px; height: 25px; background: #4a3a26 }
  .rope { position: absolute; left: 145px; top: 0; width: 10px; height: 15px; background: #7d857a }
  .hook { position: absolute; left: 135px; top: 15px; width: 30px; height: 10px; border-radius: 5px; background: #9aa196 }
  .stack {
    position: absolute;
    left: 100px; top: 30px;
    width: 100px; height: 145px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  .stack div { width: 60px; height: 20px; background: #8a5a3c }
  .stack div:nth-child(odd) { width: 80px; background: #c2705a }
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
  .pallet { position: absolute; left: 100px; bottom: 0; width: 100px; height: 25px; background: #4a3a26 }
  .hook { position: absolute; left: 135px; bottom: 175px; width: 30px; height: 10px; border-radius: 5px; background: #9aa196 }
</style>

<div class="pallet"></div>
<div class="hook"></div>

<!-- the rest is yours to build. -->`},

		{title: "The crowd", target: `<style>
  .stand { position: absolute; left: 0; top: 145px; width: 300px; height: 25px; background: #8a5a3c }
  .pitch { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #2c5e40 }
  .crowd {
    position: absolute;
    left: 15px; top: 60px;
    width: 270px; height: 85px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .fan { width: 30px; height: 85px }
  .fan .head { width: 20px; height: 20px; border-radius: 50%; margin: 0 auto; background: #e0b48c }
  .fan .body { width: 30px; height: 60px; margin-top: 5px; border-radius: 6px 6px 0 0; background: #6ee787 }
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
  .pitch { position: absolute; left: 0; bottom: 0; width: 300px; height: 30px; background: #2c5e40 }
</style>

<div class="pitch"></div>

<!-- the rest is yours to build. -->`},

		{title: "Vending machine", target: `<style>
  .cabinet { position: absolute; left: 60px; top: 20px; width: 180px; height: 170px; border-radius: 6px; background: #24384d }
  .keypad { position: absolute; left: 185px; top: 40px; width: 40px; height: 90px; background: #16283a }
  .coin { position: absolute; left: 195px; top: 140px; width: 20px; height: 5px; background: #ffd166 }
  .tray { position: absolute; left: 75px; top: 165px; width: 100px; height: 15px; background: #16283a }
  .shelf {
    position: absolute;
    left: 75px; top: 35px;
    width: 100px; height: 120px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 5px;
  }
  .shelf div { width: 30px; height: 20px; background: #ffd166 }
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
  .cabinet { position: absolute; left: 60px; bottom: 10px; width: 180px; height: 170px; border-radius: 6px; background: #24384d }
</style>

<div class="cabinet"></div>

<!-- the rest is yours to build. -->`},

		{title: "Picket fence", target: `<style>
  .grass { position: absolute; left: 0; top: 170px; width: 300px; height: 30px; background: #24422f }
  .rail { position: absolute; left: 0; width: 300px; height: 10px; background: #8a5a3c }
  .high { top: 110px }
  .low { top: 145px }
  .fence {
    position: absolute;
    left: 0; top: 90px;
    width: 300px; height: 80px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 10px;
  }
  .fence div { width: 10px; height: 70px; border-radius: 5px 5px 0 0; background: #e9f5cd }
  .fence div:nth-child(even) { height: 60px }
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
  .grass { position: absolute; left: 0; bottom: 0; width: 300px; height: 30px; background: #24422f }
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
    left: 5px; height: 55px;
    display: flex;
    gap: 30px;
  }
  .lines div { width: 5px; background: #e9f5cd }
  .lines.north { top: 25px }
  .lines.south { top: 120px }
  .row {
    position: absolute;
    left: 15px;
    display: flex;
    gap: 15px;
  }
  .row.north { top: 30px }
  .row.south { top: 130px }
  .car {
    width: 20px; height: 40px;
    border-radius: 4px;
    background: #4cc9f0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .car div { width: 10px; height: 10px; margin-top: 5px; background: #16283a }
  .south .car { align-items: flex-end }
  .south .car div { margin-bottom: 5px }
  .car:nth-child(even) { background: #ff7b54 }
  .car:nth-child(3n) { background: #ffd166 }
  .dashes {
    position: absolute;
    left: 0; top: 95px;
    width: 300px; height: 5px;
    display: flex;
    justify-content: center;
    gap: 15px;
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
  .lot { position: absolute; left: 0; bottom: 20px; width: 300px; height: 160px; background: #2b3440 }
</style>

<div class="lot"></div>

<!-- the rest is yours to build. -->`},

		{title: "Garden beds", target: `<style>
  .clouds {
    position: absolute;
    left: 15px; top: 10px;
    width: 270px; height: 30px;
    display: flex;
    justify-content: space-between;
  }
  .cloud { display: flex; align-items: flex-end }
  .cloud div { width: 20px; height: 20px; border-radius: 50%; background: #e9f5cd }
  .cloud div:nth-child(2) { width: 30px; height: 30px }
  .soil { position: absolute; left: 0; top: 150px; width: 300px; height: 50px; background: #3f2e1e }
  .flowers {
    position: absolute;
    left: 5px; top: 60px;
    height: 90px;
    display: flex;
    align-items: flex-end;
    gap: 20px;
  }
  .flower { display: flex; flex-direction: column; align-items: center }
  .head { width: 15px; height: 15px; border-radius: 50%; background: #f48fb1 }
  .stem { width: 5px; height: 60px; background: #3f8f57 }
  .flower:nth-child(even) .head { background: #ffd166 }
  .flower:nth-child(even) .stem { height: 40px }
  .flower:nth-child(3n) .head { background: #c792ea }
  .flower:nth-child(3n) .stem { height: 50px }
  .tufts {
    position: absolute;
    left: 0; top: 145px;
    width: 300px; height: 5px;
    display: flex;
    justify-content: center;
    gap: 5px;
  }
  .tufts div { width: 10px; border-radius: 5px 5px 0 0; background: #3f8f57 }
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
  <div></div><div></div><div></div><div></div>
</div>`, scaffold: `<style>
  .soil { position: absolute; left: 0; bottom: 0; width: 300px; height: 50px; background: #3f2e1e }
</style>

<div class="soil"></div>

<!-- the rest is yours to build. -->`},

		{title: "Keyboard", target: `<style>
  .case { position: absolute; left: 10px; top: 40px; width: 275px; height: 95px; border-radius: 8px; background: #2b3440 }
  .keys {
    position: absolute;
    left: 25px;
    width: 245px; height: 15px;
    display: flex;
    gap: 5px;
  }
  .keys div { width: 15px; background: #e9f5cd }
  .r1 { top: 50px }
  .r2 { top: 70px }
  .r3 { top: 90px }
  .r4 { top: 110px }
  .r1 div:first-child { width: 25px; background: #ff7b54 }
  .r1 div:nth-child(4n + 2) { background: #7a8fa6 }
  .r2 div:last-child { width: 45px; background: #ffd166 }
  .r3 div:first-child, .r3 div:last-child { width: 30px; background: #7a8fa6 }
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
  .case { position: absolute; left: 10px; bottom: 65px; width: 275px; height: 95px; border-radius: 8px; background: #2b3440 }
</style>

<div class="case"></div>

<!-- the rest is yours to build. -->`},

		{title: "Laundry day", target: `<style>
  .grass { position: absolute; left: 0; top: 185px; width: 300px; height: 15px; background: #24422f }
  .poles {
    position: absolute;
    left: 0; top: 30px;
    width: 300px; height: 155px;
    display: flex;
    justify-content: space-between;
  }
  .poles div { width: 5px; background: #5f6b5c }
  .rope { position: absolute; left: 0; width: 300px; height: 5px; background: #9aa196 }
  .top { top: 40px }
  .bottom { top: 115px }
  .line {
    position: absolute;
    left: 35px; width: 235px; height: 60px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .line.bottom { flex-direction: row-reverse }
  .shirt { width: 25px; height: 50px; background: #4cc9f0; display: flex; justify-content: center }
  .shirt div { width: 5px; height: 10px; margin-top: -5px; background: #8a5a3c }
  .shirt:nth-child(even) { width: 15px; height: 35px; background: #f48fb1 }
  .shirt:nth-child(3n) { width: 35px; height: 45px; background: #ffd166 }
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
  .grass { position: absolute; left: 0; bottom: 0; width: 300px; height: 15px; background: #24422f }
</style>

<div class="grass"></div>

<!-- the rest is yours to build. -->`},

		{title: "Metro line", target: `<style>
  .lights {
    position: absolute;
    left: 0; top: 5px;
    width: 300px; height: 10px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .lights div { width: 20px; height: 10px; background: #ffd166 }
  .lights div:nth-child(odd) { background: #e9f5cd }
  .tunnel { position: absolute; left: 0; top: 60px; width: 300px; height: 80px; background: #16283a }
  .sleepers {
    position: absolute;
    left: 0; top: 120px;
    width: 300px; height: 15px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .sleepers div { width: 10px; height: 15px; background: #3f2e1e }
  .rail { position: absolute; left: 0; top: 125px; width: 300px; height: 5px; background: #7d857a }
  .platform { position: absolute; left: 0; top: 140px; width: 300px; height: 60px; background: #2b4a63 }
  .edge {
    position: absolute;
    left: 0; top: 140px;
    width: 300px; height: 5px;
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .edge div { width: 10px; height: 5px; background: #ffd166 }
  .benches {
    position: absolute;
    left: 0; top: 165px;
    width: 300px; height: 20px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 5px;
  }
  .benches div { width: 40px; height: 10px; background: #8a5a3c }
  .benches div:nth-child(even) { width: 10px; height: 20px; background: #7d857a }
  .train {
    position: absolute;
    left: 150px; top: 65px;
    width: 130px; height: 25px;
    border-radius: 4px 10px 10px 4px;
    background: #e9f5cd;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .train div { width: 10px; height: 15px; background: #16283a }
  .train div:nth-child(3n) { background: #4cc9f0 }
  .line {
    position: absolute;
    left: 5px; top: 90px;
    width: 290px; height: 20px;
    display: flex;
    align-items: center;
  }
  .line div { flex: 1; height: 10px; background: #4cc9f0 }
  .line div:nth-child(even) { flex: none; width: 20px; height: 20px; border-radius: 50%; background: #e9f5cd }
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
  .tunnel { position: absolute; left: 0; bottom: 60px; width: 300px; height: 80px; background: #16283a }
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
  .ledge { position: absolute; left: 60px; top: 0; width: 180px; height: 10px; background: #2b3440 }
  .building {
    position: absolute;
    left: 70px; top: 10px;
    width: 160px; height: 180px;
    box-sizing: border-box;
    padding: 10px;
    background: #3a5068;
    display: flex;
    flex-direction: column;
  }
  .floor {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .floor div { width: 15px; height: 10px; background: #ffd166 }
  .floor:nth-child(odd) div:nth-child(even) { background: #16283a }
  .floor:nth-child(even) div:nth-child(odd) { background: #16283a }
  .floor:nth-child(3n) div:nth-child(4) { background: #4cc9f0 }
  .floor:last-child { align-items: flex-end }
  .floor:last-child div:nth-child(3) { height: 15px; background: #3f2e1e }
</style>

<div class="ground"></div>
<div class="ledge"></div>

<div class="building">
  <div class="floor"><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div><div></div></div>
  <div class="floor"><div></div><div></div><div></div><div></div><div></div><div></div></div>
</div>`, scaffold: `<style>
  .ground { position: absolute; left: 0; bottom: 0; width: 300px; height: 10px; background: #24422f }
</style>

<div class="ground"></div>

<!-- the rest is yours to build. -->`},

		{title: "Egg carton", target: `<style>
  .table { position: absolute; left: 0; top: 160px; width: 300px; height: 40px; background: #3f2e1e }
  .carton {
    position: absolute;
    left: 30px; top: 15px;
    width: 240px; height: 145px;
    box-sizing: border-box;
    padding: 5px;
    border-radius: 6px 6px 0 0;
    background: #b08b5a;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .row { flex: 1; display: flex; gap: 10px }
  .cup {
    flex: 1;
    border-radius: 8px;
    background: #8a6a44;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .cup div { width: 20px; height: 20px; border-radius: 50%; background: #f3ead8 }
  .cup:nth-child(3n) div { background: #d9a066 }
  .row:nth-child(even) .cup:nth-child(odd) div { background: #d9a066 }
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
  <div class="row">
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"></div>
  </div>
  <div class="row">
    <div class="cup"></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
    <div class="cup"></div>
    <div class="cup"><div></div></div>
    <div class="cup"><div></div></div>
  </div>
</div>`, scaffold: `<style>
  .table { position: absolute; left: 0; bottom: 0; width: 300px; height: 40px; background: #3f2e1e }
</style>

<div class="table"></div>

<!-- the rest is yours to build. -->`},

		{title: "Chessboard", target: `<style>
  .board {
    position: absolute;
    left: 60px; top: 10px;
    width: 180px; height: 180px;
    box-sizing: border-box;
    padding: 10px;
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
  .row > div > div { width: 10px; height: 10px; border-radius: 50%; background: #16283a }
  .row:nth-child(n + 5) > div > div { background: #f3ead8 }
  .row:first-child > div > div, .row:last-child > div > div { border-radius: 2px }
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
  .board { position: absolute; left: 60px; bottom: 10px; width: 180px; height: 180px; background: #3f2e1e }
</style>

<div class="board"></div>

<!-- the rest is yours to build. -->`},

		{title: "Calendar", target: `<style>
  .page {
    position: absolute;
    left: 50px; top: 10px;
    width: 200px; height: 180px;
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
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .week { flex: 1; display: flex; gap: 5px }
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
  .page { position: absolute; left: 50px; bottom: 10px; width: 200px; height: 180px; background: #e9f5cd }
</style>

<div class="page"></div>

<!-- the rest is yours to build. -->`},

		{title: "Freight train", target: `<style>
  .ground { position: absolute; left: 0; top: 175px; width: 300px; height: 25px; background: #24422f }
  .rail { position: absolute; left: 0; top: 170px; width: 300px; height: 5px; background: #9aa196 }
  .train {
    position: absolute;
    left: 0; top: 80px;
    width: 300px; height: 90px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 10px;
  }
  .wagon { width: 60px; display: flex; flex-direction: column }
  .body {
    height: 50px;
    background: #4cc9f0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .body div { width: 10px; height: 20px; background: #16283a }
  .wagon:nth-child(even) .body { background: #ff7b54 }
  .wagon:first-child .body { height: 70px; border-radius: 10px 0 0 0; background: #ffd166 }
  .wagon:first-child .body div { height: 30px }
  .wheels {
    height: 15px;
    padding: 0 5px;
    display: flex;
    justify-content: space-between;
  }
  .wheels div { width: 15px; border-radius: 50%; background: #7d857a }
</style>

<div class="ground"></div>
<div class="rail"></div>

<div class="train">
  <div class="wagon">
    <div class="body"><div></div><div></div></div>
    <div class="wheels"><div></div><div></div></div>
  </div>
  <div class="wagon">
    <div class="body"><div></div><div></div><div></div></div>
    <div class="wheels"><div></div><div></div></div>
  </div>
  <div class="wagon">
    <div class="body"><div></div><div></div><div></div></div>
    <div class="wheels"><div></div><div></div></div>
  </div>
  <div class="wagon">
    <div class="body"><div></div><div></div><div></div></div>
    <div class="wheels"><div></div><div></div></div>
  </div>
</div>`, scaffold: `<style>
  .rail { position: absolute; left: 0; bottom: 25px; width: 300px; height: 5px; background: #9aa196 }
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
  .sky div { width: 5px; height: 5px; margin-top: 5px; background: #e9f5cd }
  .sky div:nth-child(odd) { margin-top: 15px }
  .sky div:nth-child(3n) { width: 10px; height: 10px; margin-top: 30px; background: #ffd166 }
  .city {
    height: 120px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 10px;
  }
  .tower { display: flex; flex-direction: column; align-items: center }
  .cap { width: 15px; height: 10px; background: #2b4a63 }
  .body {
    box-sizing: border-box;
    padding: 5px;
    background: #16283a;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 5px;
  }
  .body div { width: 5px; height: 5px; background: #ffd166 }
  .tower:nth-child(even) .body div:nth-child(odd) { background: #4cc9f0 }
  .body div:nth-child(5n) { background: #24384d }
  .tower:nth-child(3n + 1) .body { width: 45px; height: 75px }
  .tower:nth-child(3n + 2) .body { width: 55px; height: 55px }
  .tower:nth-child(3n) .body { width: 25px; height: 95px }
  .tower:nth-child(3n) .cap { width: 5px; height: 15px; background: #ff7b54 }
  .road {
    height: 30px;
    background: #1d3550;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .road div { width: 20px; height: 10px; background: #e9f5cd }
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
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
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
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div>
      </div>
    </div>
    <div class="tower">
      <div class="cap"></div>
      <div class="body">
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div>
      </div>
    </div>
  </div>

  <div class="road">
    <div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`, scaffold: `<style>
  .road { position: absolute; left: 0; bottom: 0; width: 300px; height: 30px; background: #1d3550 }
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
  .rig { width: 30px; display: flex; flex-wrap: wrap }
  .rig div { width: 10px; height: 10px; background: #ffd166 }
  .rig div:nth-child(even) { background: #e9f5cd }
  .stand {
    height: 100px;
    background: #1d3550;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .tier { padding: 5px; background: #16283a; display: flex; gap: 5px }
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
  .pitch div div { width: 10px; height: 10px; border-radius: 50%; background: #ff7b54 }
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
      <div></div><div></div>
    </div>
    <div class="tier">
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      <div></div><div></div><div></div><div></div>
    </div>
    <div class="tier">
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      <div></div><div></div><div></div><div></div><div></div><div></div>
    </div>
    <div class="tier">
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
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
  .stand { position: absolute; left: 0; bottom: 60px; width: 300px; height: 100px; background: #1d3550 }
  .pitch { position: absolute; left: 0; bottom: 0; width: 300px; height: 60px; background: #2c5e40 }
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
    padding: 10px;
    background: #3f2e1e;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .shelf {
    flex: 1;
    padding: 0 10px;
    background: #24180f;
    display: flex;
    align-items: flex-end;
    gap: 5px;
  }
  .shelf:nth-child(2) { flex-direction: row-reverse }
  .book {
    width: 15px; height: 45px;
    box-sizing: border-box;
    padding: 5px 0;
    background: #c2705a;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .book div { height: 5px; background: #ffd166 }
  .book:nth-child(3n + 2) { height: 40px; background: #4cc9f0 }
  .book:nth-child(3n) { width: 10px; height: 50px; background: #6ee787 }
  .book:nth-child(4n) { height: 30px }
  .book:nth-child(4n) div { background: #e9f5cd }
  .pot { margin-left: auto; width: 25px; height: 20px; border-radius: 0 0 6px 6px; background: #8a5a3c }
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
  .case { position: absolute; left: 20px; bottom: 10px; width: 260px; height: 180px; background: #3f2e1e }
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
    height: 35px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .traces > div { display: flex; flex-direction: column; gap: 5px }
  .traces div div { width: 30px; height: 5px; background: #6ee787 }
  .traces > div:nth-child(even) div { background: #3f8f57 }
  .traces > div:nth-child(3n) div:nth-child(2) { width: 20px }
  .chips {
    height: 125px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: center;
    gap: 5px 20px;
  }
  .chip { display: flex; align-items: center }
  .pins { display: flex; flex-direction: column; gap: 10px }
  .pins div { width: 10px; height: 5px; background: #9aa196 }
  .core {
    width: 60px; height: 60px;
    box-sizing: border-box;
    padding: 5px;
    background: #0b1a12;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: center;
    gap: 10px;
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
  .leds div { width: 10px; height: 10px; border-radius: 50%; background: #6ee787 }
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
      <div class="pins"><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div></div>
    </div>
    <div class="chip">
      <div class="pins"><div></div><div></div><div></div><div></div></div>
      <div class="core"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div class="pins"><div></div><div></div><div></div><div></div></div>
    </div>
  </div>

  <div class="leds">
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`, scaffold: `<style>
  .board { position: absolute; left: 0; bottom: 0; width: 300px; height: 200px; background: #123024 }
</style>

<div class="board"></div>

<!-- the rest is yours to build. -->`},

		{title: "The quilt", target: `<style>
  .quilt {
    position: absolute;
    left: 15px; top: 10px;
    width: 270px; height: 180px;
    box-sizing: border-box;
    padding: 5px;
    background: #3f2e1e;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .row { flex: 1; display: flex; gap: 10px }
  .patch {
    flex: 1;
    box-sizing: border-box;
    padding: 5px;
    background: #e9f5cd;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .patch div { width: 10px; height: 10px; background: #c2705a }
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
  .quilt { position: absolute; left: 15px; bottom: 10px; width: 270px; height: 180px; background: #3f2e1e }
</style>

<div class="quilt"></div>

<!-- the rest is yours to build. -->`},
	}},
}
