package models

import "time"

// MarketData represents a single market listing snapshot.
type MarketData struct {
	ID         uint      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	ItemID     uint      `gorm:"column:item_id;index;not null" json:"itemId"`
	ItemName   string    `gorm:"column:item_name;size:255" json:"itemName,omitempty"`
	Price      int64     `gorm:"column:price;not null" json:"price"`
	Quantity   int32     `gorm:"column:quantity;not null" json:"quantity"`
	SellerGUID *string   `gorm:"column:seller_guid;size:255" json:"sellerGuid,omitempty"`
	NoticeTime *int64    `gorm:"column:notice_time" json:"noticeTime,omitempty"`
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
}

// TableName sets the insert table name for this struct type
func (MarketData) TableName() string {
	return "market_data"
}
