import os
import json
from datetime import datetime
from difflib import get_close_matches

import joblib
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")

app = Flask(__name__)
CORS(app)

model = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))

with open(os.path.join(MODEL_DIR, "symptoms.json")) as f:
    ALL_SYMPTOMS = json.load(f)

with open(os.path.join(MODEL_DIR, "precautions.json")) as f:
    DISEASE_INFO = json.load(f)

# Common symptom aliases — maps user words to known symptoms
SYMPTOM_ALIASES = {
    "heartpain": "chest_pain",
    "heart pain": "chest_pain",
    "heart ache": "chest_pain",
    "stomachache": "abdominal_pain",
    "stomach ache": "abdominal_pain",
    "stomach pain": "abdominal_pain",
    "tummy pain": "abdominal_pain",
    "belly pain": "abdominal_pain",
    "runny nose": "runny_nose",
    "blocked nose": "runny_nose",
    "stuffy nose": "runny_nose",
    "high temperature": "high_fever",
    "temperature": "mild_fever",
    "fever": "mild_fever",
    "hot body": "high_fever",
    "sweating": "sweating",
    "tired": "fatigue",
    "tiredness": "fatigue",
    "weakness": "weakness",
    "weak": "weakness",
    "dizzy": "dizziness",
    "dizziness": "dizziness",
    "throwing up": "vomiting",
    "threw up": "vomiting",
    "puke": "vomiting",
    "puking": "vomiting",
    "feel sick": "nausea",
    "sick feeling": "nausea",
    "can't breathe": "breathlessness",
    "breathing problem": "breathlessness",
    "shortness of breath": "breathlessness",
    "breath problem": "breathlessness",
    "joint ache": "joint_pain",
    "knee pain": "joint_pain",
    "back pain": "body_ache",
    "body pain": "body_ache",
    "muscle ache": "muscle_pain",
    "skin rash": "rash",
    "itchy skin": "itching",
    "yellow eyes": "yellow_skin",
    "yellowish skin": "yellow_skin",
    "no appetite": "loss_of_appetite",
    "not hungry": "loss_of_appetite",
    "cant eat": "loss_of_appetite",
    "frequent urination": "frequent_urination",
    "urinating often": "frequent_urination",
    "peeing often": "frequent_urination",
    "excessive thirst": "excessive_thirst",
    "always thirsty": "excessive_thirst",
    "very thirsty": "excessive_thirst",
    "blurry vision": "blurred_vision",
    "blurry eyes": "blurred_vision",
    "cant see clearly": "blurred_vision",
    "losing weight": "weight_loss",
    "weight loss": "weight_loss",
    "dry cough": "dry_cough",
    "wet cough": "cough",
    "coughing": "cough",
    "sore throat": "sore_throat",
    "throat pain": "sore_throat",
    "sneezing": "sneezing",
    "chills": "chills",
    "shivering": "chills",
    "indigestion": "indigestion",
    "acidity": "indigestion",
    "stiffness": "stiffness",
    "swollen": "swelling",
    "swelling": "swelling",
    "constipation": "constipation",
    "cant poop": "constipation",
    "sensitivity to light": "sensitivity_to_light",
    "light sensitivity": "sensitivity_to_light",
    "skin irritation": "skin_irritation",
}


def map_symptom_local(user_input):
    user_lower = user_input.lower().strip()

    # 1. Check aliases first
    if user_lower in SYMPTOM_ALIASES:
        mapped = SYMPTOM_ALIASES[user_lower]
        print(f"Alias match: {user_lower} -> {mapped}")
        return [mapped]

    # 2. Check if any symptom contains the user input
    contains_matches = [s for s in ALL_SYMPTOMS if user_lower in s or s in user_lower]
    if contains_matches:
        print(f"Contains match: {contains_matches[:2]}")
        return contains_matches[:2]

    # 3. Fuzzy match using difflib
    # Replace spaces with underscores for better matching
    user_underscore = user_lower.replace(' ', '_')
    close = get_close_matches(user_underscore, ALL_SYMPTOMS, n=2, cutoff=0.4)
    if close:
        print(f"Fuzzy match: {close}")
        return close

    # 4. Word-by-word match
    words = user_lower.split()
    word_matches = []
    for word in words:
        for symptom in ALL_SYMPTOMS:
            if word in symptom and len(word) > 3:
                word_matches.append(symptom)
    if word_matches:
        print(f"Word match: {word_matches[:2]}")
        return list(set(word_matches))[:2]

    print(f"No match found for: {user_input}")
    return []


def vectorize_symptoms(selected_symptoms):
    return np.array([[1 if s in selected_symptoms else 0 for s in ALL_SYMPTOMS]])


def build_report_text(name, age, symptoms, prediction, confidence, info):
    lines = [
        "=" * 50,
        "     AI HEALTH SYMPTOM PREDICTOR - REPORT",
        "=" * 50,
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"Patient Name: {name or 'N/A'}",
        f"Age: {age or 'N/A'}",
        "",
        "Reported Symptoms:",
    ]
    lines += [f"  - {s.replace('_', ' ').title()}" for s in symptoms]
    lines += [
        "",
        f"Predicted Condition: {prediction}",
        f"Model Confidence: {confidence}%",
        f"Severity: {info.get('severity', 'N/A')}",
        f"Recommended Specialist: {info.get('doctor', 'N/A')}",
        "",
        "Suggested Precautions:",
    ]
    lines += [f"  - {p}" for p in info.get("precautions", [])]
    lines += [
        "",
        "-" * 50,
        "DISCLAIMER: For educational purposes only.",
        "Please consult a licensed doctor for medical advice.",
        "-" * 50,
    ]
    return "\n".join(lines)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/symptoms", methods=["GET"])
def get_symptoms():
    return jsonify({"symptoms": ALL_SYMPTOMS})


@app.route("/api/map-symptom", methods=["POST"])
def map_symptom():
    data = request.get_json(force=True)
    user_input = data.get("input", "").strip()
    if not user_input:
        return jsonify({"mapped": [], "error": "No input provided"}), 400
    print(f"Mapping symptom: {user_input}")
    mapped = map_symptom_local(user_input)
    print(f"Result: {mapped}")
    return jsonify({"mapped": mapped, "original": user_input})


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    symptoms = data.get("symptoms", [])
    if not symptoms:
        return jsonify({"error": "Please provide at least one symptom"}), 400
    valid_symptoms = [s for s in symptoms if s in ALL_SYMPTOMS]
    if not valid_symptoms:
        return jsonify({"error": "None of the provided symptoms are recognized"}), 400
    X = vectorize_symptoms(valid_symptoms)
    proba = model.predict_proba(X)[0]
    top_idx = int(np.argmax(proba))
    disease = label_encoder.inverse_transform([top_idx])[0]
    confidence = round(float(proba[top_idx]) * 100, 2)
    top3_idx = np.argsort(proba)[::-1][:3]
    top3 = [
        {
            "disease": label_encoder.inverse_transform([i])[0],
            "confidence": round(float(proba[i]) * 100, 2)
        }
        for i in top3_idx
    ]
    info = DISEASE_INFO.get(disease, {})
    return jsonify({
        "prediction": disease,
        "confidence": confidence,
        "top3": top3,
        "precautions": info.get("precautions", []),
        "doctor": info.get("doctor", "General Physician"),
        "severity": info.get("severity", "Unknown"),
    })


@app.route("/api/report", methods=["POST"])
def report():
    data = request.get_json(force=True)
    name = data.get("name")
    age = data.get("age")
    symptoms = data.get("symptoms", [])
    prediction = data.get("prediction")
    confidence = data.get("confidence")
    info = DISEASE_INFO.get(prediction, {})
    text = build_report_text(name, age, symptoms, prediction, confidence, info)
    report_path = os.path.join(BASE_DIR, "health_report.txt")
    with open(report_path, "w") as f:
        f.write(text)
    return send_file(report_path, as_attachment=True, download_name="health_report.txt")


if __name__ == "__main__":
    app.run(debug=True, port=5000)