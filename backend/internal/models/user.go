package models

import "time"

// Role is a user's access level. New sign-ups default to RoleStudent.
type Role string

const (
	RoleStudent Role = "student"
	RoleExec    Role = "exec"
	RoleAdmin   Role = "admin"
)

// Team is a student's team. Empty means not yet joined.
type Team string

const (
	TeamElectrical Team = "electrical"
	TeamComputer   Team = "computer"
	TeamSoftware   Team = "software"
	TeamOldPatrol  Team = "oldPatrol"
)

// IsValidTeam reports whether t is one of the four teams. Gates both team
// selection at sign-up and the recipient of a score entry — Old Patrol is a
// joinable team, not a scoring-only recipient.
func IsValidTeam(t Team) bool {
	switch t {
	case TeamElectrical, TeamComputer, TeamSoftware, TeamOldPatrol:
		return true
	default:
		return false
	}
}

// User is the app-side record for a person with an account: the state Clerk
// doesn't own (role, team, name, major, email). ClerkID is the stable
// identity from Clerk and the upsert key. Name, Major and Email are
// collected at team selection so later records (scores, event history) can
// be attributed to a person by name instead of a raw Clerk ID.
type User struct {
	ClerkID   string    `bson:"clerkId" json:"clerkId"`
	Name      string    `bson:"name" json:"name"`
	Major     string    `bson:"major" json:"major"`
	Email     string    `bson:"email" json:"email"`
	Role      Role      `bson:"role" json:"role"`
	Team      Team      `bson:"team" json:"team"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}
