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

	t.Run("started is set by the first start and survives everything after", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end)
		if c.Started() {
			t.Fatal("started before any start")
		}
		c = c.Start(base)
		first := c.StartedAt
		c = c.Pause(base.Add(time.Minute)).Start(base.Add(2 * time.Minute)).Stop(end.Add(time.Hour))
		if !c.Started() || !c.StartedAt.Equal(first) {
			t.Fatalf("startedAt %v, want %v", c.StartedAt, first)
		}
	})

	t.Run("rehide stops the clock and hides the battle again", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end).Start(base)
		c = c.Rehide(base.Add(time.Minute))
		if c.Status != ClockStopped || c.Started() {
			t.Fatalf("status %s, started %v", c.Status, c.Started())
		}
		c = c.Start(base.Add(2 * time.Minute))
		if !c.EndsAt.Equal(end) || !c.Started() {
			t.Fatalf("restart ends at %v, started %v", c.EndsAt, c.Started())
		}
	})

	t.Run("standings hide in the last hour until revealed", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end) // 90 minutes out
		if c.StandingsHidden(base) {
			t.Fatal("hidden before the comp started")
		}
		c = c.Start(base)
		if c.StandingsHidden(base.Add(29 * time.Minute)) {
			t.Fatal("hidden with more than an hour left")
		}
		if !c.StandingsHidden(base.Add(30 * time.Minute)) {
			t.Fatal("not hidden with an hour left")
		}
		if !c.StandingsHidden(end.Add(time.Hour)) {
			t.Fatal("not hidden after time ran out")
		}
		if c.Reveal().StandingsHidden(end.Add(time.Hour)) {
			t.Fatal("still hidden after reveal")
		}
		if c.Reveal().Rehide(base).Revealed {
			t.Fatal("rehide kept the reveal")
		}
	})

	t.Run("a blackout survives stop and a later end until revealed", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end).Start(base) // 90 minutes out
		inside := base.Add(40 * time.Minute)              // 50 minutes left

		stopped := c.Latch(inside).Stop(end.Add(time.Minute)) // resets to 20 min
		stopped.Duration = 3 * 60 * 60                        // a long default round
		stopped = stopped.Stop(end.Add(time.Minute))
		if !stopped.StandingsHidden(end.Add(time.Minute)) {
			t.Fatal("stop brought the standings back")
		}

		extended := c.Latch(inside).SetEnd(inside, inside.Add(3*time.Hour))
		if !extended.StandingsHidden(inside) {
			t.Fatal("a later end brought the standings back")
		}
		if extended.Reveal().StandingsHidden(inside) {
			t.Fatal("still hidden after reveal")
		}
		if extended.Rehide(inside).Blackout {
			t.Fatal("rehide kept the blackout")
		}
		if c.Latch(base).Blackout {
			t.Fatal("latched with more than an hour left")
		}
	})

	t.Run("a passed end never goes negative", func(t *testing.T) {
		c := NewClock(1200).SetEnd(base, end).Start(base)
		if got := c.RemainingAt(end.Add(time.Hour)); got != 0 {
			t.Fatalf("remaining %d, want 0", got)
		}
	})
}
