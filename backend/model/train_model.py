"""
train_model.py
----------------
Trains and compares classification models (Decision Tree, Random Forest, Naive Bayes)
on a disease-symptom dataset, then saves the best model + supporting artifacts
(symptom list, label encoder, precautions, doctor recommendations).

For the FINAL PROJECT, replace generate_synthetic_dataset() below with loading
a real dataset, e.g. Kaggle "Disease Prediction Using Machine Learning"
(https://www.kaggle.com/datasets/kaushil268/disease-prediction-using-machine-learning)
which has the same column format: a set of binary symptom columns + a 'disease' column.
"""

import json
import random
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import BernoulliNB
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, f1_score
import joblib
import os

RANDOM_STATE = 42
random.seed(RANDOM_STATE)
np.random.seed(RANDOM_STATE)

# ------------------------------------------------------------------
# 1. Disease -> typical symptoms (this is the "domain knowledge" used
#    to generate a realistic synthetic dataset for demo purposes)
# ------------------------------------------------------------------
DISEASE_SYMPTOMS = {
    "Common Cold": ["cough", "runny_nose", "sneezing", "sore_throat", "mild_fever", "headache"],
    "Influenza (Flu)": ["high_fever", "body_ache", "chills", "fatigue", "cough", "headache", "sore_throat"],
    "COVID-19": ["high_fever", "dry_cough", "breathlessness", "loss_of_smell", "fatigue", "body_ache"],
    "Migraine": ["headache", "nausea", "vomiting", "blurred_vision", "sensitivity_to_light", "dizziness"],
    "Malaria": ["high_fever", "chills", "sweating", "headache", "nausea", "vomiting", "muscle_pain"],
    "Typhoid": ["high_fever", "abdominal_pain", "weakness", "headache", "loss_of_appetite", "constipation"],
    "Dengue": ["high_fever", "joint_pain", "rash", "headache", "muscle_pain", "fatigue", "nausea"],
    "Diabetes": ["frequent_urination", "excessive_thirst", "fatigue", "blurred_vision", "weight_loss"],
    "Hypertension": ["headache", "dizziness", "chest_pain", "blurred_vision", "fatigue"],
    "Asthma": ["breathlessness", "wheezing", "chest_pain", "cough", "fatigue"],
    "Pneumonia": ["high_fever", "cough", "breathlessness", "chest_pain", "fatigue", "chills"],
    "Bronchitis": ["cough", "chest_pain", "fatigue", "mild_fever", "breathlessness"],
    "Gastritis": ["abdominal_pain", "nausea", "vomiting", "loss_of_appetite", "indigestion"],
    "Allergy": ["sneezing", "runny_nose", "skin_irritation", "itching", "rash"],
    "Chickenpox": ["rash", "itching", "mild_fever", "fatigue", "loss_of_appetite"],
    "Jaundice": ["yellow_skin", "fatigue", "loss_of_appetite", "abdominal_pain", "nausea"],
    "Tuberculosis": ["cough", "weight_loss", "mild_fever", "fatigue", "chest_pain", "sweating"],
    "Arthritis": ["joint_pain", "swelling", "stiffness", "fatigue", "muscle_pain"],
    "Urinary Tract Infection": ["frequent_urination", "abdominal_pain", "mild_fever", "fatigue"],
}

ALL_SYMPTOMS = sorted({s for symptoms in DISEASE_SYMPTOMS.values() for s in symptoms})


def generate_synthetic_dataset(n_per_disease=120, noise_prob=0.06, dropout_prob=0.15):
    """Generates a binary symptom matrix dataset with mild realistic noise."""
    rows = []
    for disease, core_symptoms in DISEASE_SYMPTOMS.items():
        for _ in range(n_per_disease):
            row = {s: 0 for s in ALL_SYMPTOMS}
            for s in core_symptoms:
                # a core symptom is sometimes absent (dropout) to mimic real-world variation
                row[s] = 0 if random.random() < dropout_prob else 1
            # random unrelated symptoms appear occasionally (noise)
            for s in ALL_SYMPTOMS:
                if s not in core_symptoms and random.random() < noise_prob:
                    row[s] = 1
            row["disease"] = disease
            rows.append(row)
    df = pd.DataFrame(rows)
    return df


# ------------------------------------------------------------------
# 2. Build dataset
# ------------------------------------------------------------------
df = generate_synthetic_dataset()
print(f"Dataset shape: {df.shape}")

X = df[ALL_SYMPTOMS]
y = df["disease"]

le = LabelEncoder()
y_enc = le.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=RANDOM_STATE, stratify=y_enc
)

# ------------------------------------------------------------------
# 3. Train & compare models
# ------------------------------------------------------------------
models = {
    "Decision Tree": DecisionTreeClassifier(random_state=RANDOM_STATE),
    "Random Forest": RandomForestClassifier(n_estimators=60, max_depth=12, random_state=RANDOM_STATE),
    "Naive Bayes": BernoulliNB(),
}

results = {}
best_model = None
best_score = -1
best_name = None

for name, model in models.items():
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average="weighted")
    results[name] = {"accuracy": round(acc, 4), "f1_score": round(f1, 4)}
    print(f"{name:15s} -> accuracy: {acc:.4f}  f1: {f1:.4f}")
    if acc > best_score:
        best_score = acc
        best_model = model
        best_name = name

print(f"\nBest model: {best_name} (accuracy={best_score:.4f})")

# ------------------------------------------------------------------
# 4. Save artifacts
# ------------------------------------------------------------------
ARTIFACT_DIR = os.path.dirname(os.path.abspath(__file__))

joblib.dump(best_model, os.path.join(ARTIFACT_DIR, "model.pkl"))
joblib.dump(le, os.path.join(ARTIFACT_DIR, "label_encoder.pkl"))

with open(os.path.join(ARTIFACT_DIR, "symptoms.json"), "w") as f:
    json.dump(ALL_SYMPTOMS, f, indent=2)

with open(os.path.join(ARTIFACT_DIR, "model_comparison.json"), "w") as f:
    json.dump({"best_model": best_name, "results": results}, f, indent=2)

df.to_csv(os.path.join(ARTIFACT_DIR, "dataset.csv"), index=False)

print("\nSaved: model.pkl, label_encoder.pkl, symptoms.json, dataset.csv, model_comparison.json")
