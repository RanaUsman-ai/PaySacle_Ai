# Salary Prediction System
 💼 PayScale AI: Employee Salary Prediction Engine
A premium, interactive web-based Single Page Application (SPA) designed to predict employee salaries using a Decision Tree Regressor trained on real-world employee statistics. The application features a sleek dark/light user interface, searchable job autocomplete, responsive analytics charts, and a paginated database explorer.

🚀 Live Space: [Deploy on Hugging Face Spaces]

✨ Features
Decision Tree Regression Model: Predicts annual salary based on Age, Gender, Education Level, Job Title, and Years of Experience.
Smart Job Autocomplete: Dynamically filters and highlights suggestions from a dataset of 174 unique job titles as you type, avoiding long dropdown lists.
Visual Prediction Analytics:
Real-time animated count-up for predicted salary.
Custom salary tier badges (Entry, Mid-Career, High Income).
Dynamic salary placement gauge showing where the prediction falls on a $0 - $250K scale.
Comparative metrics relative to global average and specific job title averages.
Interactive Model Insights:
Dynamic feature importance chart (using Chart.js) explaining how the model weighs variables (Age, Experience, etc.).
Education Level vs. Salary distribution chart.
Direct visualization of the trained Decision Tree structure.
Data Explorer: Searchable, filterable, and paginated interactive data table displaying the underlying project dataset.
Premium UI System: Sleek glassmorphism cards, micro-animations, Lucide Icons, and an animated Dark/Light mode theme switcher.

<br>
🛠️ Tech Stack
Machine Learning & Processing: Python, Scikit-Learn, Pandas, NumPy, Pickle
Backend Server: Flask (Python Web Server), Gunicorn (Production WSGI Server)
Frontend Interface: Semantic HTML5, Vanilla CSS3 (Custom Variables & Gradients), JavaScript (ES6+ SPA routing, API integration, and Autocomplete), Chart.js (Data Visualizations), Lucide Icons (SVGs)

<br>

📂 Project Structure
text


├── .venv/                      # Python Virtual Environment
├── static/
│   ├── css/
│   │   └── style.css           # Styling sheet (Variables, Glassmorphism, Responsive Grid)
│   └── js/
│       └── app.js              # SPA routing, Predict calls, Autocomplete, Chart & Table logic
├── templates/
│   └── index.html              # Main frontend HTML5 file
├── Dockerfile                  # Container configurations for Hugging Face deployment
├── README.md                   # Project documentation
├── Salary Data.csv             # Cleaned employee dataset
├── decision_tree.png           # Trained decision tree diagram
├── decision_tree_model.pkl     # Trained Decision Tree Regressor model weights
├── requirements.txt            # Python dependencies list
└── server.py                   # Flask backend web server


<br> 

💻 Local Installation & Setup
Follow these steps to run the application locally on your machine:

Clone the Repository:

bash


git clone https://github.com/YOUR_USERNAME/salary-prediction-app.git
cd salary-prediction-app
Setup Virtual Environment: Create and activate a virtual environment (Windows):

bash


python -m venv .venv
.\.venv\Scripts\activate
Install Dependencies:

bash


pip install -r requirements.txt
Run the Flask Server:

bash


python server.py
The server will run on http://127.0.0.1:5000

🚀 Cloud Deployment
Deploying on Hugging Face Spaces (via Docker)
This project is configured to run out-of-the-box on Hugging Face Spaces using the provided Dockerfile which runs on port 7860:

Create a new Space on Hugging Face and select Docker as the SDK (use Blank template).
Upload the project files (excluding .venv) directly via the files tab or push using Git.
The Space will automatically build and run the application.

<br > 


📄 License
This project is licensed under the MIT License.
