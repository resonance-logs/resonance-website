package worker

import (
	"encoding/json"
	"log"
	"time"

	"server/jobs"
	"server/models"
	"server/queue"
)

const (
	defaultMaxRetries = 3
	retryDelay        = 5 * time.Second
)

// Worker processes jobs from a queue.
type Worker struct {
	ID    int
	Queue queue.Queue
	quit  chan bool
}

// NewWorker creates a new worker.
func NewWorker(id int, queue queue.Queue) *Worker {
	return &Worker{
		ID:    id,
		Queue: queue,
		quit:  make(chan bool),
	}
}

// Start begins the worker's job processing loop.
func (w *Worker) Start() {
	log.Printf("worker %d starting", w.ID)
	go func() {
		for {
			select {
			case <-w.quit:
				log.Printf("worker %d stopping", w.ID)
				return
			default:
				w.processJob()
			}
		}
	}()
}

// Stop terminates the worker's processing loop.
func (w *Worker) Stop() {
	w.quit <- true
}

func (w *Worker) processJob() {
	job, err := w.Queue.Dequeue()
	if err != nil {
		if err != models.ErrQueueEmpty {
			log.Printf("worker %d: error dequeuing job: %v", w.ID, err)
		}
		time.Sleep(1 * time.Second) // Wait before trying again
		return
	}

	log.Printf("worker %d: processing job %s (%s)", w.ID, job.ID, job.Type)

	err = w.executeJob(job)
	if err != nil {
		log.Printf("worker %d: error executing job %s: %v", w.ID, job.ID, err)
		w.handleFailedJob(job, err)
	} else {
		w.Queue.Complete(job)
		log.Printf("worker %d: completed job %s", w.ID, job.ID)
	}
}

func (w *Worker) executeJob(job *models.Job) error {
	switch job.Type {
	case "process_report":
		var payload struct {
			ReportID string `json:"reportId"`
			FilePath string `json:"filePath"`
		}
		if err := json.Unmarshal([]byte(job.Payload), &payload); err != nil {
			return err
		}
		jobs.ProcessReport(payload.ReportID, payload.FilePath)
	default:
		log.Printf("worker %d: unknown job type %s", w.ID, job.Type)
	}
	return nil
}

func (w *Worker) handleFailedJob(job *models.Job, err error) {
	job.RetryCount++
	job.LastError = err.Error()

	if job.RetryCount >= job.MaxRetries {
		log.Printf("worker %d: job %s failed after %d retries", w.ID, job.ID, job.MaxRetries)
		w.Queue.Fail(job, err)
	} else {
		log.Printf("worker %d: retrying job %s in %v", w.ID, job.ID, retryDelay)
		time.AfterFunc(retryDelay, func() {
			w.Queue.Enqueue(job)
		})
	}
}
