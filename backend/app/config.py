from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    llm_model: str = "openai/gpt-4o-mini"
    llm_api_key: str = ""
    llm_api_base: str = ""

    # Postgres
    postgres_url: str = "postgresql+asyncpg://postgres:RoyalSetup%4024@localhost:5432/arsDb"

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "RoyalSetup@24"

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


cfg = Settings()
