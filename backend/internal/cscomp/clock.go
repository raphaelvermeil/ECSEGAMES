package cscomp

import "time"

// The comp clock. One document, shared by everyone watching the comp, so
// the countdown on a student's screen is the same countdown the exec at
// the front of the room is running — rather than a timer that restarts
// whenever someone reloads the page.
//
// A paused clock cannot just store an end time, and a running one cannot
// just store a remaining count, so this keeps both and lets Status decide
// which one is authoritative: EndsAt while running, Remaining otherwise.
// Every transition below moves the value from one to the other.
//
// TargetEnd is separate from both: it is the wall-clock moment an exec said
// the comp runs until, and it does not move while they take their time
// pressing start. A round set to end at 16:30 and started at 15:10 still
// ends at 16:30, which is the whole point of picking a time over a length.

const (
	ClockStopped = "stopped"
	ClockRunning = "running"
	ClockPaused  = "paused"
)

// clockID is the fixed key of the single clock document.
const clockID = "clock"

// Clock is the comp countdown. Duration is the length a fresh round gets,
// so stopping can reset to it without the handler knowing the config.
type Clock struct {
	ID        string    `bson:"_id" json:"-"`
	Status    string    `bson:"status" json:"status"`
	EndsAt    time.Time `bson:"endsAt" json:"-"`
	TargetEnd time.Time `bson:"targetEnd" json:"-"`
	Remaining int       `bson:"remainingSeconds" json:"-"`
	Duration  int       `bson:"durationSeconds" json:"durationSeconds"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
	UpdatedBy string    `bson:"updatedBy" json:"updatedBy"`
}

// NewClock is a fresh, unstarted clock of the given length.
func NewClock(seconds int) Clock {
	return Clock{
		ID:        clockID,
		Status:    ClockStopped,
		Remaining: seconds,
		Duration:  seconds,
		UpdatedAt: time.Now().UTC(),
	}
}

// RemainingAt is the seconds left, whichever field currently holds the
// truth. A running clock that has passed its end time reads as zero rather
// than going negative. Whole seconds are truncated, not rounded: a client
// ticking down locally between polls must never see the number go up.
func (c Clock) RemainingAt(now time.Time) int {
	switch {
	case c.Status == ClockRunning:
		return max(0, int(c.EndsAt.Sub(now)/time.Second))
	case c.Status == ClockStopped && !c.TargetEnd.IsZero():
		// Not started, but still due to end at the picked moment, so the
		// number counts down to it rather than sitting frozen. A paused
		// clock is the opposite case and stays frozen: see Pause.
		return max(0, int(c.TargetEnd.Sub(now)/time.Second))
	default:
		return max(0, c.Remaining)
	}
}

// EndTime is the moment the countdown is heading for, or the zero time when
// no end has been set. A running clock reports its live end; anything else
// reports the target an exec picked.
func (c Clock) EndTime() time.Time {
	if c.Status == ClockRunning {
		return c.EndsAt
	}
	return c.TargetEnd
}

// Start begins or resumes the countdown. Starting a stopped clock begins a
// fresh full round, so an exec can hit start after a stop without a
// separate reset. A paused clock resumes from where it was — and if it was
// paused after running out, there is nothing to resume, so this is a no-op
// rather than a surprise fresh round; Stop is the way to reset it.
func (c Clock) Start(now time.Time) Clock {
	if c.Status == ClockRunning {
		return c
	}
	// A fresh round honours the end time an exec picked, however long they
	// took to press start. Resuming from a pause deliberately does not:
	// pausing is for taking time out of a round, and re-anchoring to the
	// target would hand every paused minute straight back.
	if c.Status == ClockStopped && c.TargetEnd.After(now) {
		c.Status = ClockRunning
		c.EndsAt = c.TargetEnd
		c.Remaining = max(0, int(c.TargetEnd.Sub(now)/time.Second))
		return c
	}
	left := max(0, c.Remaining)
	if c.Status == ClockStopped {
		left = c.Duration
	}
	if left == 0 {
		return c
	}
	c.Status = ClockRunning
	c.EndsAt = now.Add(time.Duration(left) * time.Second)
	c.Remaining = left
	return c
}

// Pause freezes the countdown where it stands. Pausing anything that is
// not running is a no-op rather than an error — the button is idempotent.
func (c Clock) Pause(now time.Time) Clock {
	if c.Status != ClockRunning {
		return c
	}
	c.Remaining = c.RemainingAt(now)
	c.Status = ClockPaused
	return c
}

// Stop halts the comp and resets. It resets rather than zeroing on purpose:
// stop is the destructive-looking button, and an exec who hits it by
// accident should lose nothing they cannot get back by hitting start.
// Ending a round early is what Pause is for.
//
// The picked end time survives a stop for that same reason, so start puts
// the round back on the same finish. Only once that moment has passed does
// this fall back to a full default round.
func (c Clock) Stop(now time.Time) Clock {
	c.Status = ClockStopped
	c.EndsAt = time.Time{}
	if c.TargetEnd.After(now) {
		c.Remaining = max(0, int(c.TargetEnd.Sub(now)/time.Second))
		return c
	}
	// The picked end has already gone by, so there is nothing to return to.
	// Clearing it is what lets the reset below actually show: RemainingAt
	// reads a stopped clock's target in preference to its remainder, so a
	// stale one would keep the display pinned at zero after a stop.
	c.TargetEnd = time.Time{}
	c.Remaining = c.Duration
	return c
}

// SetEnd points the clock at the wall-clock moment the comp runs until.
// It starts nothing: an exec sets the end while the room is still filling
// up, and presses start when it is ready.
//
// A running clock moves its finish there straight away, so this is also how
// a round in progress gets extended or cut short.
func (c Clock) SetEnd(now, target time.Time) Clock {
	c.TargetEnd = target
	c.Remaining = max(0, int(target.Sub(now)/time.Second))
	if c.Status == ClockRunning {
		c.EndsAt = target
	}
	return c
}
