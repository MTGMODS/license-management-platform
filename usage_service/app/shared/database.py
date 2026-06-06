from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.shared.config import settings

# Use SQLite for don't start PostgreSQL container in debug mode 
database_url = settings.DATABASE_POSTGRES_URL if not settings.DEBUG_MODE else settings.DATABASE_URL

engine = create_async_engine(database_url, echo=False)

AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()