# Gavel-MUN

** Preview

Gavel is a platform i designed after going through multiple gruelling hours of chairing.Honestly listening to the speeches and managing the committee wanst the worst part, it was the 1000 tabs that came with it. I had to switch constantly between timers and multiple poorly organised spreadsheets, and built this as a result of the frustration. this lived in my device locally for a bit before actually pushing it into this repo. It enables a centralised app for ALL your MUN tasks, and when i mean ALL i truly mean it.


## Tech Stack
- **Frontend:** React, Vite, HTML5, Vanilla CSS
- **Backend & Database:** Firebase Realtime Database 
- **Authentication:** Firebase Anonymous Authentication 

## features of the awesome app

- cross device link to share it with your super cool vice chairs and real time sync 
- Add countries effortlessly by importing csv( smart import option is available meaning that it will automatically find the country column when there are multiple columns available)
- Start MODS and UNMODS effortlessy when a GSL is happening
- Seperate section for Points Of Information (POIs)
- Seperate secion for Motions ( topic of a passed motion automatically is loaded on to the topic header of the mod and unmod)
  

## Security Architecture

To ensure data integrity and safeguard credentials:
- **Environment Variables:** All Firebase API keys and configurations have been extracted from the source code and are managed via a `.env` file, following  Vite's `VITE_FIREBASE_*` rules. 
- **Firestore Security Rules:** The database requires authentication to read and write data. Anonymous authentication is utilized to make it more secure while not compromising on update times.

