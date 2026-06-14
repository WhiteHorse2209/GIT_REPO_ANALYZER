import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import pickle

# Load dataset
df = pd.read_csv("data/Student_Performance.csv")

# Features and target
X = df[["Hours Studied", "Previous Scores", "Sleep Hours", "Sample Question Papers Practiced"]]
y = df["Performance Index"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)
print(f"R2 Score: {r2_score(y_test, predictions):.2f}")
print(f"Mean Absolute Error: {mean_absolute_error(y_test, predictions):.2f}")

# Save model
pickle.dump(model, open("src/model.pkl", "wb"))
print("Model saved successfully!")