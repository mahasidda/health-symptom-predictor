\# 🩺 AI Health Symptom Predictor



A full-stack AI-powered web application that predicts possible diseases based on user-reported symptoms, suggests precautions, recommends the right doctor, and generates a downloadable health report.



\## 🔗 Live Demo

\- \*\*Frontend:\*\* https://health-symptom-predictor-pi.vercel.app

\- \*\*Backend API:\*\* https://health-symptom-predictor-fszu.onrender.com



\## 🖥️ Screenshots

> Select symptoms → Get prediction → Download report



\## ✨ Features

\- Select symptoms from 38+ options with search filter

\- AI predicts the most likely disease with confidence score

\- Shows top 3 possible conditions

\- Suggests precautions for the predicted disease

\- Recommends the right type of doctor

\- Download a health report as a text file



\## 🧠 ML Models Compared



| Model | Accuracy | F1 Score |

|-------|----------|----------|

| Decision Tree | 80.9% | 80.8% |

| Naive Bayes | 92.8% | 92.8% |

| \*\*Random Forest\*\* | \*\*93.6%\*\* | \*\*93.6%\*\* |



Best model (Random Forest) is automatically selected and saved.



\## 🏥 Diseases Covered

Common Cold, Influenza, COVID-19, Migraine, Malaria, Typhoid, Dengue, Diabetes, Hypertension, Asthma, Pneumonia, Bronchitis, Gastritis, Allergy, Chickenpox, Jaundice, Tuberculosis, Arthritis, Urinary Tract Infection



\## 🛠️ Tech Stack



| Layer | Technology |

|-------|------------|

| Frontend | React, Axios, React-Toastify |

| Backend | Python, Flask, Flask-CORS |

| ML | Scikit-learn, Pandas, NumPy |

| Algorithms | Random Forest, Decision Tree, Naive Bayes |

| Deployment | Vercel (frontend), Render (backend) |



\## 📁 Project Structure

health-symptom-predictor/



├── backend/



│   ├── app.py



│   ├── requirements.txt



│   ├── Procfile



│   └── model/



│       ├── train\_model.py



│       ├── model.pkl



│       ├── label\_encoder.pkl



│       ├── symptoms.json



│       ├── precautions.json



│       └── dataset.csv



└── frontend/



└── src/



├── App.js



└── pages/



└── SymptomPredictorPage.jsx



\## ⚙️ Run Locally



\### Backend

```bash

cd backend

pip install -r requirements.txt

python app.py

```



\### Frontend

```bash

cd frontend

npm install

npm start

```



\## 🚀 Deployment

\- Backend deployed on \*\*Render\*\*

\- Frontend deployed on \*\*Vercel\*\*



\## ⚠️ Disclaimer

This app is for educational purposes only and is not a substitute for professional medical advice. Always consult a licensed doctor.

