import streamlit as st
import pickle
import numpy as np

# Load model
model = pickle.load(open("src/model.pkl", "rb"))

# App title
st.title("🎓 Student Performance Predictor")
st.write("Fill in the details below to predict your exam score!")

# Input sliders
hours = st.slider("Hours Studied per Day", 1, 12, 5)
prev_score = st.slider("Previous Exam Score", 40, 100, 70)
sleep = st.slider("Sleep Hours per Day", 4, 10, 7)
papers = st.slider("Sample Papers Practiced", 0, 10, 3)

# Predict button
if st.button("Predict My Score!"):
    input_data = np.array([[hours, prev_score, sleep, papers]])
    result = model.predict(input_data)
    st.success(f"📊 Predicted Performance Score: {result[0]:.1f} / 100")
    if result[0] >= 80:
        st.balloons()
        st.write("🌟 Excellent! Keep it up!")
    elif result[0] >= 60:
        st.write("👍 Good job! You can do even better!")
    else:
        st.write("📚 Keep studying! You've got this!")