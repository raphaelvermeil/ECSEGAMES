package models

import "time"

// Role is a user's access level. New sign-ups default to RoleStudent.
type Role string

const (
	RoleStudent Role = "student"
	RoleExec    Role = "exec"
	RoleAdmin   Role = "admin"
)

// Team is a student's program team. Empty means not yet joined.
type Team string

const (
	TeamElectrical Team = "electrical"
	TeamComputer   Team = "computer"
	TeamSoftware   Team = "software"
)

// IsValidTeam reports whether t is one of the three program teams.
func IsValidTeam(t Team) bool {
	switch t {
	case TeamElectrical, TeamComputer, TeamSoftware:
		return true
	default:
		return false
	}
}

// User is the app-side record for a person with an account: the state Clerk
// doesn't own (role, team). ClerkID is the stable identity from Clerk and the
// upsert key; profile data like email stays in Clerk rather than being copied.
type User struct {
	ClerkID   string    `bson:"clerkId" json:"clerkId"`
	Role      Role      `bson:"role" json:"role"`
	Team      Team      `bson:"team" json:"team"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}
