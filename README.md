# ABL Index Analyzer

A utility tool for automatic analysis of FOR/FIND/CAN-FIND statements in Progress 4GL source files, correlating the filters used in code with the indexes defined in DF schema files.
The goal is to detect whether the code is using appropriate indexes, highlight potential issues, and suggest optimal index structures based on the table definitions.

## ✨ Features

- Upload .p, .w, .i, .cls files or a .zip containing Progress source code
- Upload DF files exported from the Data Dictionary

Automatic extraction of:
- FOR EACH, FOR FIRST, FOR LAST
- FIND, FIND FIRST, FIND LAST
- CAN-FIND(...) blocks
- Detection of fields used in WHERE clauses
- Comparison of used fields vs. existing table indexes

Detection of:
- fully compatible indexes
- partially matching indexes
- missing or inadequate indexes
- Automatic generation of DF index suggestions
- Console-style UI showing logs, warnings, and recommended indexes

## 🧠 How it Works

The user uploads Progress source files and DF schema files.

The internal parsers read:

- table definitions
- index structures
- filters used in FOR/FIND statements
- The analysis engine compares both sides to determine index usage quality.

The tool outputs:

- matching indexes
- warnings
- DF-formatted suggestions for ideal indexes

## 📦 Tech Stack

- React + TypeScript
- Vite for development and bundling
- Custom parsers for:
- Progress source code
- DF schema structure
- Pure client-side execution (no backend required)

## 🚀 Getting Started
```bash
Install dependencies
npm install

Run the development server
npm run dev

Build for production
npm run build
```

## 📂 Project Structure
```bash
src/
 ├─ components/     # Upload UI, file list, etc.
 ├─ parsers/        # Source code and DF parsers + index advisor
 ├─ services/       # DF and Progress file loaders
 ├─ utils/          # Index generator and helpers
 ├─ styles.css      # Global styles
 └─ App.tsx         # Main UI workflow
```

## 📄 License

Choose the license you prefer (MIT, Apache 2.0, GPLv3).

## 📝 Notes

This tool is intended for developers working with Progress 4GL and TOTVS/Progress-based ERP systems, helping identify index misuse and improve database query performance without manually inspecting large codebases.