# CSUB Dating Web App

## Overview

Our project is going to be a web-based dating app desgined to be used within California State University Bakersfield, among students of the school. The goal is to allow students to connect with eachother annonymously and reveal themselves only if they feel a real connection. 


## Features 

 User registration and login (with csub email) 
 User profiles (major, interests, pictures, bio, etc.)
 Matchmaking based on hobbies, major, etc. 
 1 on 1 chat system. 
 Profile reveal only if users choose to match. 

## Stretch Goals
Expand beyond CSUB to include support of other campuses. 
Expansion to a application. 
Potential for more traditional non-anonymous dating experience. 

# how it works
1. Users create an account and log in.
2. Users create a profile with basic information.
3. Users can:
   * Enter blind matching to be paired anonymously
   * once matched users can chat. 
   * if both users agree profiles are revealed. 

# Meet the team. 

# Angel (Database)

# Nathaniel (backend/logic)


# Abubaker (Frontend)



# Setup Guide
1. Clone/download the repository
2. Download mysql or MariaDB on your PC. Also download Node.js
3. Run npm install in both the server and react-app directory to install required dependencies
4. Create a file called ".env" in the server folder formatted as:
5. Create a gmail app and add email and app password to the env
```env
DB_HOST=localhost
DB_USER=root (most likely deafult)
DB_PASSWORD=your password 
DB_NAME=datingapp
EMAIL_USER=email
EMAIL_PASSWORD=passcode
```
5. Go to the server directory and run "npm run start" to launch the server. For the client-side front-end, go to react-app and run "npm run dev".



