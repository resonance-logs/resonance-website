package queue

import (
    "server/models"
    "sync"
)

// Queue is an interface for a simple job queue.
type Queue interface {
    Enqueue(*models.Job) error
    Dequeue() (*models.Job, error)
    Complete(*models.Job) error
    Fail(*models.Job, error) error
}

// InMemoryQueue is a simple in-memory implementation of a job queue.
type InMemoryQueue struct {
    mu    sync.Mutex
    jobs  []*models.Job
    limit int
}

// NewInMemoryQueue creates a new in-memory queue with a given limit.
func NewInMemoryQueue(limit int) *InMemoryQueue {
	return &InMemoryQueue{
		jobs:  make([]*models.Job, 0),
		limit: limit,
	}
}

// Enqueue adds a job to the queue.
func (q *InMemoryQueue) Enqueue(job *models.Job) error {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.jobs) >= q.limit {
		return models.ErrQueueFull
	}

	q.jobs = append(q.jobs, job)
	return nil
}

// Dequeue removes and returns a job from the queue.
func (q *InMemoryQueue) Dequeue() (*models.Job, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if len(q.jobs) == 0 {
		return nil, models.ErrQueueEmpty
	}

	job := q.jobs[0]
	q.jobs = q.jobs[1:]
	return job, nil
}

// Complete marks a job as complete (not implemented for in-memory queue).
func (q *InMemoryQueue) Complete(job *models.Job) error {
	// In a real implementation, this would update the job's status in a persistent store.
	return nil
}

// Fail marks a job as failed (not implemented for in-memory queue).
func (q *InMemoryQueue) Fail(job *models.Job, err error) error {
	// In a real implementation, this would update the job's status and error message.
	return nil
}
