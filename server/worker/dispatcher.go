package worker

import (
	"log"

	"server/queue"
)

// Dispatcher manages a pool of workers.
type Dispatcher struct {
	workers    []*Worker
	MaxWorkers int
	queue      queue.Queue
	quit       chan bool
}

// NewDispatcher creates a new dispatcher.
func NewDispatcher(queue queue.Queue, maxWorkers int) *Dispatcher {
	return &Dispatcher{
		MaxWorkers: maxWorkers,
		queue:      queue,
		quit:       make(chan bool),
	}
}

// Run starts the dispatcher and the workers.
func (d *Dispatcher) Run() {
	for i := 0; i < d.MaxWorkers; i++ {
		worker := NewWorker(i+1, d.queue)
		worker.Start()
		d.workers = append(d.workers, worker)
	}

	log.Println("dispatcher started with", d.MaxWorkers, "workers")
}

// Stop stops the dispatcher and all workers.
func (d *Dispatcher) Stop() {
	log.Println("stopping dispatcher")
	for _, worker := range d.workers {
		worker.Stop()
	}
	d.quit <- true
}