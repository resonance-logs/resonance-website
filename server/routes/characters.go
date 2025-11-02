package routes

import (
	cc "server/controller/characters"

	"github.com/gin-gonic/gin"
)

func RegisterCharacterRoutes(rg *gin.RouterGroup) {
	chars := rg.Group("/characters")
	{
		chars.GET("/:name/:server", cc.GetCharacter)
	}
}
