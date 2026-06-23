import os
import json
from datetime import datetime

import joblib
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import urllib.request

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


def vectorize_symptoms(selected_symptoms):
    return np.array([[1 if s in selected_symptoms else 0 for s in ALL_SYMPTOMS]])


def map_symptom_with_ai(user_input):
    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    print(f"API Key present: {bool(api_key)}")

    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set")
        return []

    try:
        payload = json.dumps({
            "model": "claude-haiku-4-5",
            "max_tokens": 200,
            "messages": [{
                "role": "user",
                "content": f"""You are a medical symptom mapper. The user described a symptom as: "{user_input}".
From this list of known symptoms: {', '.join(ALL_SYMPTOMS)}.
Return ONLY a JSON array of the most relevant matching symptoms from the list above (max 3).
Example: ["chest_pain", "breathlessness"]
Return only the JSON array, nothing else."""
            }]
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://api.anthropic.com/v1/messages',
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': api_key
            }
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            text = data['content'][0]['text'].strip()
            print(f"AI response: {text}")
            clean = text.replace('```json', '').replace('```', '').strip()
            result = json.loads(clean)
            print(f"Mapped symptoms: {result}")
            return result
    except Exception as e:
        print(f"AI mapping error: {e}")
        return []


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
    mapped = map_symptom_with_ai(user_input)
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