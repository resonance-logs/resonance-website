package database

import (
	"fmt"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Config holds database configuration
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	Charset  string
	ParseTime bool
}

// LoadConfigFromEnv loads database configuration from environment variables
func LoadConfigFromEnv() Config {
	parseTime := GetEnv("DB_PARSETIME", "true") == "true"
	return Config{
		Host:      GetEnv("DB_HOST", "localhost"),
		Port:      GetEnv("DB_PORT", "3306"),
		User:      GetEnv("DB_USER", "root"),
		Password:  GetEnv("DB_PASSWORD", ""),
		DBName:    GetEnv("DB_NAME", "resonance"),
		Charset:   GetEnv("DB_CHARSET", "utf8mb4"),
		ParseTime: parseTime,
	}
}

// Connect establishes a connection to the database
func Connect(config Config) error {
	// MySQL DSN format: user:password@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local
	parseTimeStr := "False"
	if config.ParseTime {
		parseTimeStr = "True"
	}
	
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=%s&parseTime=%s&loc=Local",
		config.User,
		config.Password,
		config.Host,
		config.Port,
		config.DBName,
		config.Charset,
		parseTimeStr,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	DB = db
	return nil
}

// Close closes the database connection
func Close() error {
	if DB == nil {
		return nil
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	if err := sqlDB.Close(); err != nil {
		return fmt.Errorf("failed to close database connection: %w", err)
	}

	return nil
}

// AutoMigrate runs database migrations for the given models
func AutoMigrate(models ...interface{}) error {
	if DB == nil {
		return fmt.Errorf("database connection not initialized")
	}

	return DB.AutoMigrate(models...)
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// GetEnv retrieves an environment variable with a default fallback
func GetEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
