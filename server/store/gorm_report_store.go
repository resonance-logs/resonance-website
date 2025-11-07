package store

import (
	"encoding/json"
	"log"

	"server/models"

	"gorm.io/gorm"
)

// GormReportStore is a GORM-backed implementation of models.ReportStore.
type GormReportStore struct {
	db *gorm.DB
}

// NewGormReportStore constructs a new GormReportStore.
func NewGormReportStore(db *gorm.DB) *GormReportStore {
	return &GormReportStore{db: db}
}

// SaveReport upserts basic report metadata and fight summaries.
func (s *GormReportStore) SaveReport(r *models.Report) {
	var row models.ReportRow
	err := s.db.Where("report_id = ?", r.ReportID).First(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			row = models.ReportRow{ReportID: r.ReportID}
		} else {
			log.Printf("gorm: error querying report %s: %v", r.ReportID, err)
			return
		}
	}

	if r.Title != "" {
		row.Title = &r.Title
	}
	if r.Owner != "" {
		row.Owner = &r.Owner
	}

	// Persist fight summaries if provided on the Report DTO
	if r.Fights != nil {
		if b, err := json.Marshal(r.Fights); err == nil {
			row.FightSummaries = b
		} else {
			log.Printf("gorm: error marshaling fight summaries for %s: %v", r.ReportID, err)
		}
	}

	if err := s.db.Save(&row).Error; err != nil {
		log.Printf("gorm: error saving report %s: %v", r.ReportID, err)
	}
}

// GetReport loads a report by reportId and converts it to the public Report DTO.
func (s *GormReportStore) GetReport(id string) (*models.Report, bool) {
	var row models.ReportRow
	if err := s.db.Where("report_id = ?", id).First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, false
		}
		log.Printf("gorm: error loading report %s: %v", id, err)
		return nil, false
	}

	rep := &models.Report{ReportID: row.ReportID, Fights: []models.FightSummary{}}
	if row.Title != nil {
		rep.Title = *row.Title
	}
	if row.Owner != nil {
		rep.Owner = *row.Owner
	}

	// Unmarshal fight summaries into DTO
	if len(row.FightSummaries) > 0 {
		var sums []models.FightSummary
		if err := json.Unmarshal(row.FightSummaries, &sums); err == nil {
			rep.Fights = sums
		} else {
			log.Printf("gorm: error unmarshaling fight summaries for %s: %v", id, err)
		}
	}

	// Convert start/end times to string fields if needed (left empty for now)

	return rep, true
}

// SaveFight appends a detailed fight into the persisted 'fights' JSONB column.
func (s *GormReportStore) SaveFight(reportID string, f *models.Fight) {
	var row models.ReportRow
	if err := s.db.Where("report_id = ?", reportID).First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// create basic row if missing
			row = models.ReportRow{ReportID: reportID}
		} else {
			log.Printf("gorm: error querying report for SaveFight %s: %v", reportID, err)
			return
		}
	}

	// Unmarshal existing detailed fights
	var fights []models.Fight
	if len(row.Fights) > 0 {
		if err := json.Unmarshal(row.Fights, &fights); err != nil {
			log.Printf("gorm: error unmarshaling fights for %s: %v", reportID, err)
			fights = []models.Fight{}
		}
	}
	fights = append(fights, *f)
	if b, err := json.Marshal(fights); err == nil {
		row.Fights = b
	} else {
		log.Printf("gorm: error marshaling fights for %s: %v", reportID, err)
	}

	if err := s.db.Save(&row).Error; err != nil {
		log.Printf("gorm: error saving fights for %s: %v", reportID, err)
	}
}

// GetFight returns a detailed fight by id from the persisted fights JSONB.
func (s *GormReportStore) GetFight(reportID string, fightID int) (*models.Fight, bool) {
	var row models.ReportRow
	if err := s.db.Where("report_id = ?", reportID).First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, false
		}
		log.Printf("gorm: error loading report for GetFight %s: %v", reportID, err)
		return nil, false
	}
	var fights []models.Fight
	if len(row.Fights) > 0 {
		if err := json.Unmarshal(row.Fights, &fights); err != nil {
			log.Printf("gorm: error unmarshaling fights for GetFight %s: %v", reportID, err)
			return nil, false
		}
	}
	for _, f := range fights {
		if f.ID == fightID {
			return &f, true
		}
	}
	return nil, false
}

// SetStatus updates the lightweight status fields on the reports row.
func (s *GormReportStore) SetStatus(reportID string, st *models.Status) {
	var row models.ReportRow
	if err := s.db.Where("report_id = ?", reportID).First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			row = models.ReportRow{ReportID: reportID}
		} else {
			log.Printf("gorm: error querying report for SetStatus %s: %v", reportID, err)
			return
		}
	}
	row.Status = st.Status
	row.Progress = st.Progress
	row.Message = &st.Message
	if err := s.db.Save(&row).Error; err != nil {
		log.Printf("gorm: error saving status for %s: %v", reportID, err)
	}
}

// GetStatus reads the status fields for a report.
func (s *GormReportStore) GetStatus(reportID string) (*models.Status, bool) {
	var row models.ReportRow
	if err := s.db.Where("report_id = ?", reportID).First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, false
		}
		log.Printf("gorm: error loading report for GetStatus %s: %v", reportID, err)
		return nil, false
	}
	msg := ""
	if row.Message != nil {
		msg = *row.Message
	}
	return &models.Status{Status: row.Status, Progress: row.Progress, Message: msg}, true
}
