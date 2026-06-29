import os
import math
import pickle
import pandas as pd
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(__name__, static_folder="static", template_folder="templates")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "decision_tree_model.pkl")
CSV_PATH = os.path.join(BASE_DIR, "Salary Data.csv")

# Load model
model = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as file:
            model = pickle.load(file)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"Model file not found at {MODEL_PATH}")

# Load and clean dataset for categories and statistics
df = pd.read_csv(CSV_PATH)
df.drop_duplicates(inplace=True)
df.dropna(inplace=True)

# Build sorted lists of unique values for encoding (equivalent to LabelEncoder)
GENDERS = sorted(df["Gender"].unique().tolist())
EDUCATION_LEVELS = sorted(df["Education Level"].unique().tolist())
JOB_TITLES = sorted(df["Job Title"].unique().tolist())

@app.route("/")
def home():
    """Serve the single-page application dashboard."""
    return render_template("index.html")

@app.route("/decision_tree.png")
def serve_decision_tree():
    """Serve the decision tree visualization from the root."""
    return send_from_directory(BASE_DIR, "decision_tree.png")

@app.route("/static/<path:path>")
def serve_static(path):
    """Serve static files explicitly if needed."""
    return send_from_directory("static", path)

@app.route("/api/metadata", methods=["GET"])
def get_metadata():
    """Return options for dropdowns and range of numerical variables."""
    return jsonify({
        "genders": GENDERS,
        "education_levels": EDUCATION_LEVELS,
        "job_titles": JOB_TITLES,
        "age_range": {
            "min": int(df["Age"].min()),
            "max": int(df["Age"].max()),
            "default": 30
        },
        "experience_range": {
            "min": float(df["Years of Experience"].min()),
            "max": float(df["Years of Experience"].max()),
            "default": 5.0
        }
    })

@app.route("/api/predict", methods=["POST"])
def predict():
    """Predict salary based on input features."""
    if model is None:
        return jsonify({"error": "Model is not loaded on server."}), 500
    
    try:
        data = request.json
        age = float(data.get("age"))
        gender = data.get("gender")
        education = data.get("education")
        job_title = data.get("job_title")
        experience = float(data.get("experience"))
        
        # Validation
        if gender not in GENDERS:
            return jsonify({"error": f"Invalid Gender: '{gender}'"}), 400
        if education not in EDUCATION_LEVELS:
            return jsonify({"error": f"Invalid Education Level: '{education}'"}), 400
        if job_title not in JOB_TITLES:
            return jsonify({"error": f"Invalid Job Title: '{job_title}'"}), 400
            
        # Label encoding mapping (must match model training alphabetical mapping)
        gender_encoded = GENDERS.index(gender)
        education_encoded = EDUCATION_LEVELS.index(education)
        job_encoded = JOB_TITLES.index(job_title)
        
        # Prepare input dataframe
        sample = pd.DataFrame({
            "Age": [age],
            "Gender": [gender_encoded],
            "Education Level": [education_encoded],
            "Job Title": [job_encoded],
            "Years of Experience": [experience]
        })
        
        # Predict
        predicted_salary = float(model.predict(sample)[0])
        
        # Additional statistics relative to prediction
        avg_for_role = float(df[df["Job Title"] == job_title]["Salary"].mean())
        global_avg = float(df["Salary"].mean())
        pct_diff_global = ((predicted_salary - global_avg) / global_avg) * 100
        
        # Salary tier determination
        if predicted_salary < 60000:
            tier = "Entry Level Salary"
            tier_color = "#3b82f6" # blue
        elif predicted_salary < 120000:
            tier = "Mid-Career Salary"
            tier_color = "#f59e0b" # amber
        else:
            tier = "High Income Tier"
            tier_color = "#10b981" # emerald
            
        return jsonify({
            "predicted_salary": predicted_salary,
            "tier": tier,
            "tier_color": tier_color,
            "average_for_role": avg_for_role if not pd.isna(avg_for_role) else None,
            "pct_difference_global": pct_diff_global
        })
        
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Return dashboard analytics and feature importances."""
    total_records = len(df)
    avg_salary = float(df["Salary"].mean())
    min_salary = float(df["Salary"].min())
    max_salary = float(df["Salary"].max())
    
    # Feature importances
    feature_names = ['Age', 'Gender', 'Education Level', 'Job Title', 'Years of Experience']
    importances = [0.0] * 5
    if hasattr(model, "feature_importances_"):
        importances = [float(val) for val in model.feature_importances_]
        
    feature_importance_data = [
        {"feature": name, "importance": round(imp * 100, 2)}
        for name, imp in zip(feature_names, importances)
    ]
    
    # Education breakdown
    edu_stats = df.groupby("Education Level")["Salary"].agg(["mean", "count"]).reset_index()
    edu_breakdown = [
        {
            "education": row["Education Level"],
            "avg_salary": round(float(row["mean"]), 2),
            "count": int(row["count"])
        }
        for _, row in edu_stats.iterrows()
    ]
    
    return jsonify({
        "total_records": total_records,
        "avg_salary": round(avg_salary, 2),
        "min_salary": round(min_salary, 2),
        "max_salary": round(max_salary, 2),
        "feature_importance": feature_importance_data,
        "education_breakdown": edu_breakdown
    })

@app.route("/api/data", methods=["GET"])
def get_data():
    """Paginate and search project CSV data for Data Explorer tab."""
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))
    search = request.args.get("search", "").lower()
    
    filtered_df = df.copy()
    if search:
        # Search across text fields: Job Title, Education Level, Gender
        filtered_df = filtered_df[
            filtered_df["Job Title"].str.lower().str.contains(search) |
            filtered_df["Education Level"].str.lower().str.contains(search) |
            filtered_df["Gender"].str.lower().str.contains(search)
        ]
        
    total_records = len(filtered_df)
    total_pages = math.ceil(total_records / per_page)
    
    start = (page - 1) * per_page
    end = start + per_page
    
    rows = filtered_df.iloc[start:end].to_dict(orient="records")
    
    return jsonify({
        "rows": rows,
        "total": total_records,
        "pages": total_pages,
        "current_page": page
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
