# Crowd Count Project Using YOLO and Deep SORT

## Overview
This project is a web application built with Flask that performs crowd counting using YOLO (You Only Look Once) object detection and Deep SORT for tracking. It supports multiple feeds (camera or video) and allows users to define zones for counting.

## Features
- User authentication and role management (admin and user roles)
- Manage multiple feeds (camera or video)
- Define zones on feeds for crowd counting
- Real-time object detection and tracking using YOLO and Deep SORT
- Admin panel for managing users and feeds
- Dashboard and analysis reports

## Technologies Used
- Python 3
- Flask web framework
- Flask SQLAlchemy for ORM and database management
- Flask JWT Extended for authentication
- YOLO for object detection
- Deep SORT for object tracking
- SQLite as the database
- AdminLTE for admin panel UI
- HTML, CSS, JavaScript for frontend

## Project Structure
- `app.py`: Main Flask application setup and route registration
- `models.py`: Database models for User, Feed, and Zone
- `blueprints/`: Flask blueprints for modular route handling (auth, dashboard, feeds, analysis, admin panel)
- `static/`: Static files including CSS, JS, images, and uploads
- `templates/`: HTML templates for rendering pages
- `clean_db.py`: Standalone script for database cleanup
- `check_users.py`: Standalone script to check and create admin user if none exist
- `yolo_service.py`: YOLO and Deep SORT integration for object detection and tracking

## Setup and Installation
1. Clone the repository:
   ```
   git clone https://github.com/SakshamAgrawal1337/croud_count_using_yolo_and_deep_sort.git
   cd croud_count_using_yolo_and_deep_sort
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate   # On Windows
   source venv/bin/activate  # On Linux/Mac
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the application:
   ```
   python app.py
   ```

## Usage
- Access the web app at `http://localhost:5000`
- Register or login as a user/admin
- Add feeds and define zones for crowd counting
- View dashboard and analysis reports

## Additional Scripts
- `clean_db.py`: Run this script to clean up the database by deleting certain zones and dropping specific tables.
- `check_users.py`: Run this script to check existing users and create a default admin user if none exist.

## License
This project is licensed under the MIT License.

## Author
Saksham Agrawal
