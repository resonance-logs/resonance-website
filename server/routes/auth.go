package routes

import (
	"context"

	"server/controller/auth"
	"server/db"
	"server/models"
	"server/store"

	"github.com/gin-gonic/gin"
)

// authDeps holds shared auth-related stores for middleware and handlers.
var authDeps struct {
	UserStore    store.UserStore
	SessionStore store.SessionStore
}

// InitAuthDeps initializes shared auth stores.
func InitAuthDeps() {
	if authDeps.UserStore != nil && authDeps.SessionStore != nil {
		return
	}
	dbConn, _ := db.InitDB()
	if dbConn == nil {
		return
	}
	authDeps.UserStore = store.NewGormUserStore(dbConn)
	authDeps.SessionStore = store.NewGormSessionStore(dbConn)
}

// AuthMiddleware resolves current user from rsn_session cookie.
func AuthMiddleware() gin.HandlerFunc {
	InitAuthDeps()
	return func(c *gin.Context) {
		if authDeps.SessionStore == nil || authDeps.UserStore == nil {
			c.Next()
			return
		}

		token, err := c.Cookie("rsn_session")
		if err != nil || token == "" {
			c.Next()
			return
		}

		ctx := context.Background()
		sess, err := authDeps.SessionStore.GetByToken(ctx, token)
		if err != nil {
			c.Next()
			return
		}

		user, err := authDeps.UserStore.GetByID(ctx, sess.UserID)
		if err != nil {
			c.Next()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

// RequireAuth ensures a user is present in context, otherwise 401.
func RequireAuth(c *gin.Context) (*models.User, bool) {
	u, ok := c.Get("user")
	if !ok || u == nil {
		c.JSON(401, gin.H{"error": "unauthorized"})
		c.Abort()
		return nil, false
	}
	user, ok := u.(*models.User)
	if !ok || user == nil {
		c.JSON(401, gin.H{"error": "unauthorized"})
		c.Abort()
		return nil, false
	}
	return user, true
}

// RegisterAuthRoutes wires authentication-related routes.
func RegisterAuthRoutes(rg *gin.RouterGroup) {
	InitAuthDeps()
	if authDeps.UserStore == nil || authDeps.SessionStore == nil {
		return
	}

	h := auth.NewAuthHandler(authDeps.UserStore, authDeps.SessionStore)
	authGroup := rg.Group("/auth")
	authGroup.GET("/discord/login", h.DiscordLogin)
	authGroup.GET("/discord/callback", h.DiscordCallback)
	authGroup.GET("/me", h.Me)
	authGroup.POST("/logout", h.Logout)
}
