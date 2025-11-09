package apiErrors

import (
	"fmt"
)

// ErrorResponse defines the structure for a standard API error.
type ErrorResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// NewErrorResponse creates a new ErrorResponse.
func NewErrorResponse(code int, message string, details ...interface{}) *ErrorResponse {
	resp := &ErrorResponse{
		Code:    code,
		Message: message,
	}
	if len(details) > 0 {
		resp.Details = details[0]
	}
	return resp
}

// Error implements the error interface.
func (e *ErrorResponse) Error() string {
	return fmt.Sprintf("API Error (code %d): %s", e.Code, e.Message)
}
