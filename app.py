import streamlit as st
import pandas as pd
import pickle

# ----------------------------
# Load Model
# ----------------------------
with open("decision_tree_model.pkl", "rb") as file:
    model = pickle.load(file)

# ----------------------------
# Load Dataset
# ----------------------------
df = pd.read_csv("Salary Data.csv")

st.set_page_config(
    page_title="Salary Prediction",
    page_icon="💼",
    layout="centered"
)

st.title("💼 Employee Salary Prediction")
st.write("Enter employee information below.")

# ----------------------------
# User Inputs
# ----------------------------

age = st.number_input(
    "Age",
    min_value=18,
    max_value=70,
    value=25
)

gender = st.selectbox(
    "Gender",
    sorted(df["Gender"].unique())
)

education = st.selectbox(
    "Education Level",
    sorted(df["Education Level"].unique())
)

job = st.selectbox(
    "Job Title",
    sorted(df["Job Title"].unique())
)

experience = st.number_input(
    "Years of Experience",
    min_value=0.0,
    max_value=40.0,
    value=2.0
)

# ----------------------------
# Temporary Encoding
# ----------------------------

gender_map = {
    value: index
    for index, value in enumerate(sorted(df["Gender"].unique()))
}

education_map = {
    value: index
    for index, value in enumerate(sorted(df["Education Level"].unique()))
}

job_map = {
    value: index
    for index, value in enumerate(sorted(df["Job Title"].unique()))
}

# ----------------------------
# Prediction
# ----------------------------

if st.button("Predict Salary 💰"):

    sample = pd.DataFrame({

        "Age":[age],

        "Gender":[gender_map[gender]],

        "Education Level":[education_map[education]],

        "Job Title":[job_map[job]],

        "Years of Experience":[experience]

    })

    prediction = model.predict(sample)

    st.success(f"Predicted Salary : ${prediction[0]:,.2f}")