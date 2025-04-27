# typing-tutor

![Screenshot Placeholder](link_to_screenshot.png) <!-- Optional: Replace with a link to an actual screenshot later -->

A comprehensive typing tutor application designed to run locally on Android using Termux. Built with Node.js, Express, MariaDB, and Vanilla JavaScript.

This repository contains the source code featured in the [YouTube Tutorial](https://www.youtube.com/unbndlab) on the unbndlab channel.

## Features

*   **Multiple Practice Modes:** Lessons, Tests (Time, Words, Code, Quote), General Time/Word Practice.
*   **Structured Lessons:** Focusing on specific keys/rows (easily extensible via `content.json`).
*   **Real-time Metrics:** Calculates WPM, Accuracy, Errors, and Time elapsed/remaining.
*   **Progress Tracking:** Saves results to a local MariaDB database.
*   **Dashboard:** Visualizes progress (WPM/Accuracy over time) using Chart.js and displays recent results in a table.
*   **Settings:** Customizable theme (Light/Dark) and Sound Effects toggle (saved locally).
*   **Visual Keyboard:** Highlights expected keys during practice.
*   **Backend:** Simple Node.js/Express backend to serve the app and interact with the database.
*   **Single User Focus:** Designed for individual use directly within Termux.

## Technologies Used

*   **Frontend:** HTML, CSS, Vanilla JavaScript
*   **Backend:** Node.js, Express.js
*   **Database:** MariaDB (MySQL compatible)
*   **Environment:** Termux (Android)
*   **Libraries/Packages:** `mysql2`, `dotenv`, `cors`, Chart.js (via CDN)

## Prerequisites

*   Android Device
*   Termux App installed from F-Droid (recommended for latest updates)
*   Basic familiarity with the command line.
*   Internet connection (for initial package downloads).

## Setup Instructions

1.  **Clone the Repository:**
    *   Install `git` in Termux: `pkg install git`
    *   Clone this repository into your Termux home directory:
        ```bash
        cd ~
        git clone https://github.com/unbndlab/YOUR_REPO_NAME.git
        cd typing-tutor
        ```

2.  **Install Termux Packages:**
    ```bash
    pkg update && pkg upgrade -y
    pkg install nodejs-lts mariadb vim # Or your preferred editor
    ```

3.  **Setup MariaDB:**
    *   Start the MariaDB server:
        ```bash
        mariadbd-safe --datadir=$PREFIX/var/lib/mysql &
        ```
    *   **(Recommended)** Secure the installation (set root password, etc.):
        ```bash
        mariadb-secure-installation
        ```
        *(Follow the prompts. Remember the root password you set, or just press Enter if you didn't set one initially).*
    *   Log in to MariaDB as root:
        ```bash
        mariadb -u root -p
        ```
        *(Enter your MariaDB root password)*
    *   Create the database and user for the application **(execute these commands inside the MariaDB console)**. Replace the placeholders with the details you will put in your `.env` file:
        ```sql
        CREATE DATABASE your_db_name_here;
        CREATE USER 'your_db_user_here'@'localhost' IDENTIFIED BY 'your_db_password_here';
        GRANT ALL PRIVILEGES ON your_db_name_here.* TO 'your_db_user_here'@'localhost';
        FLUSH PRIVILEGES;
        EXIT;
        ```

4.  **Configure Environment:**
    *   Navigate to the project directory: `cd ~/typing-tutor`
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the `.env` file using `vim .env` or `nano .env`.
    *   Fill in your actual MariaDB database name, username, and password that you created in the previous step. **Do not commit your `.env` file to Git!** (The included `.gitignore` prevents this).

5.  **Install Node.js Dependencies:**
    *   Make sure you are in the project directory (`~/typing-tutor`).
    *   Run:
        ```bash
        npm install
        ```
        *(This needs to be run from within the Termux home directory structure, not shared storage, to avoid symlink errors).*

6.  **Populate Database:**
    *   Ensure the MariaDB server is still running (see step 3a).
    *   Run the database setup script:
        ```bash
        npm run setup-db
        ```
        *(This creates the necessary tables and loads initial lessons/tests from `content.json`)*.

## Running the Application

1.  **Start MariaDB Server (if not already running):**
    ```bash
    mariadbd-safe --datadir=$PREFIX/var/lib/mysql &
    ```

2.  **Start the Node.js Server:**
    *   Navigate to the project directory: `cd ~/typing-tutor`
    *   Run:
        ```bash
        npm run dev
        ```
        *(This uses nodemon for auto-restarts during development)*
        *   Alternatively, use `npm start` for a standard start.
    *   Wait for the message `Server running on http://localhost:3000`.

3.  **Access the App:**
    *   Open a web browser **on the same Android device**.
    *   Go to the address: `http://localhost:3000`

## Project Structure
<!--
<pre>
typing-tutor/
├── public/ # Frontend files (HTML, CSS, JS, sounds)
├── server/ # *Backend files (Node.js/Express)*
│ ├── server.js # *Main Express app*
│ ├── db.js # *Database connection*
│ ├── routes/ # *API route handlers*
│ └── scripts/ # *Utility scripts (DB setup)*
├── content.json # *Lesson/test definitions*
├── .env # *Local environment variables (DB secrets)*
├── .env.example # *Example environment file*
├── .gitignore # *Files ignored by Git (node_modules, .env)*
├── package.json # *Node.js project dependencies & scripts*
└── README.md # This file
</pre>
-->
```
typing-tutor/
├── public/             # Frontend files
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── sounds/
│       ├── keypress.wav
│       └── error.wav
├── server/             # Backend files
│   ├── server.js       # Main Express app
│   ├── db.js           # Database connection logic
│   ├── routes/
│   │   ├── content.js  # Routes for lessons/tests
│   │   └── results.js  # Routes for saving/fetching results
│   └── scripts/
│       └── populate_db.js # Script to load content into DB
├── content.json        # Lesson/test definitions
├── .env                # Environment variables (DB credentials, port)
├── .env.example      # Example environment file
├── .gitignore     # Files ignored by Git (node_modules, .env)
└── package.json        # Node.js project config
└── README.md # This file
```
## Contributing

This project is primarily for a tutorial demonstration. Feel free to fork and modify for your own use. Pull requests for bug fixes or small improvements might be considered.

## License

MIT
