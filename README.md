# 🎯 Resonance Logs

[![GitHub Downloads](https://img.shields.io/github/downloads/resonance-logs/resonance-website/total?style=for-the-badge&color=%23ff9800)](https://github.com/resonance-logs/resonance-logs/releases) [![Discord](https://img.shields.io/discord/1417447600608510015?color=%235865F2&label=Discord&style=for-the-badge)](https://discord.gg/aPPHe8Uq8Q)

[![GitHub Release](https://img.shields.io/github/v/release/resonance-logs/resonance-logs?style=flat-square)](https://github.com/resonance-logs/resonance-logs/releases) [![GitHub License](https://img.shields.io/github/license/resonance-logs/resonance-website?style=flat-square)](https://github.com/resonance-logs/resonance-website/blob/main/LICENSE) [![GitHub Issues](https://img.shields.io/github/issues/resonance-logs/resonance-website?style=flat-square)](https://github.com/resonance-logs/resonance-website/issues) [![GitHub Stars](https://img.shields.io/github/stars/resonance-logs/resonance-website?style=flat-square)](https://github.com/resonance-logs/resonance-website/stargazers)

> **Live Website:** [bpsr.app](https://bpsr.app/)  
> **Desktop App:** [resonance-logs](https://github.com/resonance-logs/resonance-logs)

---

## 📋 Overview

Resonance Logs is a comprehensive combat log analysis platform for **Blue Protocol: Star Resonance**. Explore combat logs, leaderboards, and community-shared encounters with detailed performance analytics.

### ✨ Key Features

- 🏆 **Leaderboards & Rankings** - Browse top encounters and player performances
- 📊 **Detailed Analytics** - Inspect encounter pages with performance breakdowns
- 🎯 **Class Statistics** - View class and specialization performance data
- ⚔️ **Combat Analysis** - Upload encounters from desktop app for community sharing
- 🎨 **Beautiful UI** - Modern, responsive design

---

## Get Started

Visit [**bpsr.app**](https://bpsr.app/get-started) and follow the instructions

---

## 🛠 Tech Stack

**Core Technologies:**
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&style=flat-square)](https://reactjs.org/) [![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&style=flat-square)](https://nextjs.org/) [![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go&style=flat-square)](https://golang.org/) [![Gin](https://img.shields.io/badge/Gin-HTTP_web_framework-lightgrey?logo=go&style=flat-square)](https://github.com/gin-gonic/gin) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&style=flat-square)](https://www.postgresql.org/) [![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&style=flat-square)](https://redis.io/)

![Tech Stack](image.png)

---

## 🏗️ Architecture

```
resonance-website/
├── app/                    # Next.js frontend application
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── types/         # TypeScript definitions
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Go backend server
│   ├── controller/        # API controllers
│   ├── routes/            # Route definitions
│   ├── models/           # Database models
│   └── middleware/       # Authentication & middleware
├── scripts/              # Build and deployment scripts
└── docs/                # Documentation
```

---

## 📦 Related Projects

### 🎯 [Resonance Logs Desktop App](https://github.com/resonance-logs/resonance-logs)
A cross-platform desktop application that records live combat encounters and uploads them to the web platform for analysis and sharing.

**Features:**
- ⚔️ Real-time combat log recording
- 📤 Automatic upload to resonance-website
- 💾 Local data storage and management
- 🔄 Background synchronization

---

## 💬 Community & Support

- 🌐 **Website:** [bpsr.app](https://bpsr.app/)
- 💬 **Discord:** [Join our community](https://discord.gg/aPPHe8Uq8Q)
- 🐛 **Issues:** [GitHub Issues](https://github.com/resonance-logs/resonance-website/issues)
- 📖 **Documentation:** [Wiki](https://github.com/resonance-logs/resonance-website/wiki)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Special thanks to these amazing projects and communities:

- [PotRooms/StarResonanceData](https://github.com/PotRooms/StarResonanceData) - Blue Protocol data resources
- [snoww/loa-logs](https://github.com/snoww/loa-logs) - Inspiration for combat log analysis
- Blue Protocol community - For feedback and testing
- All contributors who helped make this project possible

