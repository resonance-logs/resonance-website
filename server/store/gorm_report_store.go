package store

import (
    "encoding/json"
    "log"
    "time"

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
func (s *GormReportStore) SaveReport(r *models.Report) error {
	var row models.ReportRow
	err := s.db.Where("report_id = ?", r.ReportID).First(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			row = models.ReportRow{ReportID: r.ReportID}
		} else {
			log.Printf("gorm: error querying report %s: %v", r.ReportID, err)
			return err
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
			return err
		}
	}

	if err := s.db.Save(&row).Error; err != nil {
		log.Printf("gorm: error saving report %s: %v", r.ReportID, err)
		return err
	}
	return nil
}

// GetReport loads a report by reportId and converts it to the public Report DTO.
func (s *GormReportStore) GetReport(id string) (*models.Report, error) {
	var row models.ReportRow
	if err := s.db.Where("report_id = ?", id).First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.ErrNotFound
		}
		log.Printf("gorm: error loading report %s: %v", id, err)
		return nil, err
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
			return nil, err
		}
	}

    // Timestamps
    rep.CreatedAt = row.CreatedAt.Format(time.RFC3339)
    rep.UpdatedAt = row.UpdatedAt.Format(time.RFC3339)

	return rep, nil
}

// SaveFight appends a detailed fight into the persisted 'fights' JSONB column.
func (s *GormReportStore) SaveFight(reportID string, f *models.Fight) error {
	var row models.ReportRow
	if err := s.db.Where("report_id = ?", reportID).First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// create basic row if missing
			row = models.ReportRow{ReportID: reportID}
		} else {
			log.Printf("gorm: error querying report for SaveFight %s: %v", reportID, err)
			return err
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
		return err
	}

	if err := s.db.Save(&row).Error; err != nil {
		log.Printf("gorm: error saving fights for %s: %v", reportID, err)
		return err
	}
	return nil
}

// GetFight returns a detailed fight by id from the persisted fights JSONB.
func (s *GormReportStore) GetFight(reportID string, fightID int) (*models.Fight, error) {
	var row models.ReportRow
	if err := s.db.Where("report_id = ?", reportID).First(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, models.ErrNotFound
		}
		log.Printf("gorm: error loading report for GetFight %s: %v", reportID, err)
		return nil, err
	}
	var fights []models.Fight
	if len(row.Fights) > 0 {
		if err := json.Unmarshal(row.Fights, &fights); err != nil {
			log.Printf("gorm: error unmarshaling fights for GetFight %s: %v", reportID, err)
			return nil, err
		}
	}
	for _, f := range fights {
		if f.ID == fightID {
			return &f, nil
		}
	}
	return nil, models.ErrNotFound
}

// SetStatus updates the lightweight status fields on the reports row.
func (s *GormReportStore) SetStatus(reportID string, st models.Status) error {
    var row models.ReportRow
    if err := s.db.Where("report_id = ?", reportID).First(&row).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            row = models.ReportRow{ReportID: reportID}
        } else {
            log.Printf("gorm: error querying report for SetStatus %s: %v", reportID, err)
            return err
        }
    }
    row.Status = st.Status
    row.Progress = st.Progress
    if st.Message != "" {
        row.Message = &st.Message
    } else {
        row.Message = nil
    }
    if err := s.db.Save(&row).Error; err != nil {
        log.Printf("gorm: error saving status for %s: %v", reportID, err)
        return err
    }
    return nil
}

// GetStatus reads the status fields for a report.
func (s *GormReportStore) GetStatus(reportID string) (*models.Status, error) {
    var row models.ReportRow
    if err := s.db.Where("report_id = ?", reportID).First(&row).Error; err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, models.ErrNotFound
        }
        log.Printf("gorm: error loading report for GetStatus %s: %v", reportID, err)
        return nil, err
    }
    st := &models.Status{Status: row.Status, Progress: row.Progress}
    if row.Message != nil {
        st.Message = *row.Message
    }
    return st, nil
}

func (s *GormReportStore) ListReports(page, pageSize int, filters models.ReportFilters, sort models.SortOptions) ([]*models.Report, int, error) {
	var rows []models.ReportRow
	var total int64

	db := s.db.Model(&models.ReportRow{})

	if filters.Owner != "" {
		db = db.Where("owner = ?", filters.Owner)
	}
	if filters.Status != "" {
		db = db.Where("status = ?", filters.Status)
	}
	if filters.StartDate != "" {
		db = db.Where("created_at >= ?", filters.StartDate)
	}
	if filters.EndDate != "" {
		db = db.Where("created_at <= ?", filters.EndDate)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	order := sort.SortBy + " " + sort.SortOrder

	offset := (page - 1) * pageSize
	if err := db.Order(order).Offset(offset).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	reports := make([]*models.Report, len(rows))
	for i, row := range rows {
		reports[i] = row.ToReport()
	}

	return reports, int(total), nil
}
