package models

import "time"

// Role is a user's access level. New sign-ups default to RoleStudent.
type Role string

const (
	RoleStudent Role = "student"
	RoleExec    Role = "exec"
	RoleAdmin   Role = "admin"
)

// User is a person with an account, synced from Clerk into MongoDB.
// ClerkID is the stable identity from Clerk and the upsert key.
type User struct {
	ClerkID   string    `bson:"clerkId" json:"clerkId"`
	Email     string    `bson:"email" json:"email"`
	Role      Role      `bson:"role" json:"role"`
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}
