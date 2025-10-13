from mangum import Mangum
from main import app

# Mangum is an adapter to run ASGI apps (like FastAPI) on AWS Lambda/Vercel
handler = Mangum(app, lifespan="off")
