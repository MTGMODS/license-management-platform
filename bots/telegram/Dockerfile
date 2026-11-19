FROM python:3.15.2-slim-trixie

WORKDIR /bot

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

COPY main.py .

CMD ["python", "main.py"]