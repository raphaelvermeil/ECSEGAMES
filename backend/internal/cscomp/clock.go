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
// than going negative.
func (c Clock) RemainingAt(now time.Time) int {
	if c.Status != ClockRunning {
		return max(0, c.Remaining)
	}
	return max(0, int(c.EndsAt.Sub(now).Round(time.Second)/time.Second))
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

// Stop halts the comp and resets to a full round. It resets rather than
// zeroing on purpose: stop is the destructive-looking button, and an exec
// who hits it by accident should lose nothing they cannot get back by
// hitting start. Ending a round early is what Pause is for.
func (c Clock) Stop() Clock {
	c.Status = ClockStopped
	c.Remaining = c.Duration
	c.EndsAt = time.Time{}
	return c
}

// Adjust adds delta seconds (negative to take time away), clamped at zero.
// It works in whichever mode the clock is in: a running clock moves its
// end time, a paused one moves its stored remainder, and a stopped one
// changes the length of the next round — so an exec who sets up a
// 20-minute round before starting keeps it through a Stop.
func (c Clock) Adjust(now time.Time, delta int) Clock {
	left := max(0, c.RemainingAt(now)+delta)
	c.Remaining = left
	switch c.Status {
	case ClockRunning:
		c.EndsAt = now.Add(time.Duration(left) * time.Second)
	case ClockStopped:
		c.Duration = left
	}
	return c
}
