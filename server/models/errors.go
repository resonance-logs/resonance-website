package models

import "errors"

var (
	ErrNotFound   = errors.New("not found")
	ErrQueueFull  = errors.New("queue is full")
	ErrQueueEmpty = errors.New("queue is empty")
)
