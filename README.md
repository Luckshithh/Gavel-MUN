# Gavel-MUN

**A High-Performance Committee Management Platform for Model United Nations**

Gavel-MUN is an advanced, high-performance web platform designed to streamline and elevate the experience of managing a Model United Nations (MUN) committee. Developed with precision, care, and security in mind, this platform solves real-world operational challenges for MUN Chairs and Secretariats by providing dynamic, real-time tools for parliamentary procedure.

## The Value Proposition

Managing a fast-paced MUN committee is operationally taxing. Chairs often struggle to accurately track speaker times, manage unmoderated caucuses, resolve points, and calculate delegation points simultaneously using scattered spreadsheets and standalone timers.

**Gavel-MUN solves this by centralizing committee operations:**
- **Reduces human error:** Centralized tracking for the General Speaker's List (GSL) and Moderated Caucuses.
- **Saves time:** Real-time sync ensures that the dais and the delegates are always aligned on the flow of debate.
- **Empowers the dais:** Seamlessly integrated Points Ledger to accurately evaluate and score delegations based on their participation.

## Tech Stack
- **Frontend:** React, Vite, HTML5, Vanilla CSS
- **Backend & Database:** Firebase Realtime Database (Real-time synchronization across devices)
- **Authentication:** Firebase Anonymous Authentication (Secured backend access)
- **Icons & Tooling:** Lucide React

## Features Showcase
- **Dynamic Speaker Lists:** Maintain the GSL and effortlessly reorder, add, or skip speakers.
- **Advanced Motion Timers:** Specialized timing features for Moderated and Unmoderated caucuses.
- **Points Ledger:** A comprehensive, scalable point-tracking system for grading delegations based on speeches, Points of Information (POIs), and passed motions.
- **Real-Time Data Sync:** Instant state reflection for anyone connected to the specific Committee ID.

## Security Architecture & Best Practices

To ensure data integrity and safeguard credentials:
- **Environment Variables:** All Firebase API keys and configurations have been extracted from the source code and are managed via a `.env` file, adhering to Vite's `VITE_FIREBASE_*` conventions. 
- **Firestore Security Rules:** The database requires authentication to read and write data. Anonymous authentication is utilized behind the scenes so the platform remains seamless for users while enforcing security rules against unauthenticated API requests.

*Recommendation for Firebase Admins: Ensure your Realtime Database rules enforce `auth != null`.*

## Local Setup Instructions

Follow these instructions to run Gavel-MUN locally on your machine.

### Prerequisites
- Node.js (v18 or higher recommended)
- A Firebase project with Realtime Database enabled

### 1. Clone & Install Dependencies
```bash
git clone <repository_url>
cd mun-app
npm install
```

### 2. Configure Environment Variables
This project requires environment variables to connect to your Firebase project.

1. Copy the provided template file:
   ```bash
   cp .env.example .env
   ```
2. Open the newly created `.env` file and replace the placeholder strings with your actual Firebase project credentials (found in your Firebase Console under Project Settings).

### 3. Start the Development Server
```bash
npm run dev
```

The application will start locally (usually on `http://localhost:5173`).
