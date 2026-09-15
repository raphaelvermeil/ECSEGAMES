package cscomp

import (
	"bytes"
	"errors"
	"image"
	"image/png"
)

// matchTolerance is the per-channel slack, on a 0-255 scale, for calling
// two pixels equal. Exact equality would be wrong: antialiasing along a
// clip-path or a rotated edge varies by a bit or two even between renders
// of identical markup. Ten forgives that while still demanding the right
// shapes, positions and colours.
const matchTolerance = 10

// errSizeMismatch means one of the images was not the challenge canvas —
// a corrupt or hand-made target rather than anything the student did.
var errSizeMismatch = errors.New("cscomp: image is not the challenge canvas size")

// decodePNG decodes rasterized bytes into an image.
func decodePNG(b []byte) (image.Image, error) {
	return png.Decode(bytes.NewReader(b))
}

// MatchPercent scores got against want as the share of pixels that agree
// within matchTolerance, from 0 to 100. Alpha is ignored: a screenshot is
// fully opaque, and only the visible colour matters.
//
// This is the authoritative score. Both images come from the same
// renderer, the same Chrome and the same viewport (see render.go and
// cmd/seedcscomp), which is what makes a pixel diff meaningful at all.
func MatchPercent(got, want image.Image) (float64, error) {
	gb, wb := got.Bounds(), want.Bounds()
	if gb.Dx() != renderWidth || gb.Dy() != renderHeight ||
		wb.Dx() != renderWidth || wb.Dy() != renderHeight {
		return 0, errSizeMismatch
	}

	matched := 0
	for y := 0; y < renderHeight; y++ {
		for x := 0; x < renderWidth; x++ {
			gr, gg, gbl, _ := got.At(gb.Min.X+x, gb.Min.Y+y).RGBA()
			wr, wg, wbl, _ := want.At(wb.Min.X+x, wb.Min.Y+y).RGBA()
			if within(gr, wr) && within(gg, wg) && within(gbl, wbl) {
				matched++
			}
		}
	}
	return float64(matched) / float64(renderWidth*renderHeight) * 100, nil
}

// within reports whether two RGBA() channel values (16-bit, alpha
// pre-multiplied) are within matchTolerance of each other once scaled back
// down to 8 bits.
func within(a, b uint32) bool {
	x, y := int(a>>8), int(b>>8)
	d := x - y
	if d < 0 {
		d = -d
	}
	return d <= matchTolerance
}
