import time
import httpx
from typing import Callable, Any

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 15):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.state = "CLOSED" # CLOSED (працює), OPEN (лежить), HALF_OPEN (перевірка)
        self.last_failure_time = 0

    def call(self, func: Callable, *args, **kwargs) -> Any:

        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
            else:
                raise Exception("CIRCUIT_BREAKER_OPEN")

        try:

            result = self._execute_with_retries(func, *args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _execute_with_retries(self, func: Callable, retries: int = 2, *args, **kwargs) -> Any:
        last_exception = None
        for attempt in range(retries + 1):
            try:
                return func(*args, **kwargs)
            except (httpx.TimeoutException, httpx.NetworkError) as e:
                last_exception = e
                print(f"[Retry] Спроба {attempt + 1} провалилася. Чекаємо...")
                time.sleep(0.5)
        raise last_exception

    def _on_success(self):
        self.failures = 0
        self.state = "CLOSED"

    def _on_failure(self):
        self.failures += 1
        if self.failures >= self.failure_threshold:
            self.state = "OPEN"
            self.last_failure_time = time.time()
            print("[Circuit Breaker] Спрацював! Сервіс тимчасово відключено.")

generator_circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=10)