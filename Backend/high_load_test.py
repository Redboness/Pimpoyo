# locustfile.py
import os
from locust import HttpUser, task, between
from dotenv import load_dotenv

load_dotenv()

# --- Configura aquí un usuario y contraseña válidos de tu base de datos ---
TEST_USER_APODO = os.getenv("TEST_USER_APODO", "TestUser")
TEST_USER_PASSWORD = os.getenv("TEST_USER_PASSWORD", "TestUserPassword")
# --------------------------------------------------------------------

class PimpoyoUser(HttpUser):
    wait_time = between(1, 5)  # Espera entre 1 y 5 segundos entre tareas
    token = None

    def on_start(self):
        """Se ejecuta una vez por cada usuario simulado al iniciar."""
        if not TEST_USER_APODO or not TEST_USER_PASSWORD:
            print("ERROR: Las credenciales de test (TEST_USER_APODO, TEST_USER_PASSWORD) no están configuradas.")
            self.environment.runner.quit()
            return

        try:
            # 1. Iniciar sesión para obtener el token JWT
            response = self.client.post(
                "/token",
                data={"username": TEST_USER_APODO, "password": TEST_USER_PASSWORD}
            )
            response.raise_for_status() # Lanza excepción si no es 2xx
            self.token = response.json()["access_token"]
            print(f"Usuario simulado {self.environment.runner.user_count} ha iniciado sesión.")
        except Exception as e:
            print(f"No se pudo iniciar sesión para el usuario de test. Error: {e}")
            self.environment.runner.stop() # Detiene el test si el login falla

    @task
    def chat_libre(self):
        """Simula una pregunta al chatbot."""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            payload = {
                "model": "gemma3:4b", # Usa un modelo ligero para el test si quieres
                "messages": [
                    {"role": "system", "content": "Eres un asistente."},
                    {"role": "user", "content": "Explica la gravedad como si tuviera 5 años."}
                ]
            }
            self.client.post("/bot/chatlibre", json=payload, headers=headers, name="/bot/chatlibre")
