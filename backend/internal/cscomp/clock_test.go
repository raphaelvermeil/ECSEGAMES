package cscomp

import (
	"testing"
	"time"
)

// The clock's transitions are the fiddly part of the comp: an end time has
// to survive the gap before start, a pause has to not quietly eat it, and a
// stop has to reset once it has gone by. These are pure functions over a
// fixed clock, so they need no database and no env vars.

func TestClockEndTime(t *testing.T) {
	base := time.Date(2026, 9, 20, 15, 0, 0, 0, time.UTC)
	end := time.Date(2026, 9, 20, 16, 30, 0, 0, time.UTC)

	t.Run("start honours the picked end however late it is pressed", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end)
		if c.Status != ClockStopped {
			t.Fatalf("SetEnd started the clock: %s", c.Status)
		}
		started := base.Add(10 * time.Minute)
		c = c.Start(started)
		if !c.EndsAt.Equal(end) {
			t.Fatalf("ends at %v, want %v", c.EndsAt, end)
		}
		if got := c.RemainingAt(started); got != 80*60 {
			t.Fatalf("remaining %d, want %d", got, 80*60)
		}
	})

	t.Run("stopped clock with an end counts down live", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end)
		if got := c.RemainingAt(base.Add(30 * time.Minute)); got != 60*60 {
			t.Fatalf("remaining %d, want %d", got, 60*60)
		}
	})

	t.Run("pause freezes and resume does not re-anchor", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end).Start(base)
		paused := base.Add(30 * time.Minute) // 60 min left
		c = c.Pause(paused)
		if got := c.RemainingAt(paused.Add(5 * time.Minute)); got != 60*60 {
			t.Fatalf("paused clock moved: %d", got)
		}
		resumed := paused.Add(5 * time.Minute)
		c = c.Start(resumed)
		// The five paused minutes are given back, so the end moves out.
		want := resumed.Add(60 * time.Minute)
		if !c.EndsAt.Equal(want) {
			t.Fatalf("resumed to %v, want %v", c.EndsAt, want)
		}
	})

	t.Run("stop keeps the end, and start returns to it", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end).Start(base)
		stopped := base.Add(20 * time.Minute)
		c = c.Stop(stopped)
		if c.Status != ClockStopped {
			t.Fatalf("status %s", c.Status)
		}
		if got := c.RemainingAt(stopped); got != 70*60 {
			t.Fatalf("after stop remaining %d, want %d", got, 70*60)
		}
		c = c.Start(stopped)
		if !c.EndsAt.Equal(end) {
			t.Fatalf("restart ends at %v, want %v", c.EndsAt, end)
		}
	})

	t.Run("stop falls back to a default round once the end has passed", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end).Start(base)
		late := end.Add(time.Minute)
		c = c.Stop(late)
		if got := c.RemainingAt(late); got != 1200 {
			t.Fatalf("remaining %d, want 1200", got)
		}
	})

	t.Run("setting an end on a running clock moves it immediately", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end).Start(base)
		later := time.Date(2026, 9, 20, 17, 0, 0, 0, time.UTC)
		c = c.SetEnd(base.Add(time.Minute), later)
		if c.Status != ClockRunning {
			t.Fatalf("status %s", c.Status)
		}
		if !c.EndsAt.Equal(later) {
			t.Fatalf("ends at %v, want %v", c.EndsAt, later)
		}
	})

	t.Run("a clock with no end still works on duration", func(t *testing.T) {
		c := NewClock(1200).Start(base)
		if got := c.RemainingAt(base); got != 1200 {
			t.Fatalf("remaining %d, want 1200", got)
		}
		c = c.Stop(base)
		if got := c.RemainingAt(base); got != 1200 {
			t.Fatalf("after stop %d, want 1200", got)
		}
	})

	t.Run("a passed end never goes negative", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end).Start(base)
		if got := c.RemainingAt(end.Add(time.Hour)); got != 0 {
			t.Fatalf("remaining %d, want 0", got)
		}
	})
}
