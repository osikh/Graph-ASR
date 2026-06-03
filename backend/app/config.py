from pydantic_settings import BaseSettings, SettingsConfigDict

PROVIDER_URLS = {
    "lmstudio":   "http://localhost:1234/v1",
    "llamacpp":   "http://localhost:8080/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}

# LM Studio and llama.cpp accept any non-empty string as the key
PROVIDER_DEFAULT_KEYS = {
    "lmstudio":   "lm-studio",
    "llamacpp":   "not-needed",
    "openrouter": "",           # must be set in .env for openrouter
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    llm_provider: str = "lmstudio"     # lmstudio | llamacpp | openrouter
    llm_model: str = "local-model"     # model name served by the provider
    llm_api_key: str = ""              # overrides provider default key
    llm_api_base: str = ""             # overrides provider default base URL

    # Postgres
    postgres_url: str = "postgresql+asyncpg://postgres:RoyalSetup%4024@localhost:5432/arsdb"

    # Neo4j
    neo4j_uri: str = "neo4j://127.0.0.1:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "RoyalSetup@24"

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def resolved_base_url(self) -> str:
        return self.llm_api_base or PROVIDER_URLS.get(self.llm_provider, PROVIDER_URLS["lmstudio"])

    @property
    def resolved_api_key(self) -> str:
        return self.llm_api_key or PROVIDER_DEFAULT_KEYS.get(self.llm_provider, "lm-studio")


cfg = Settings()
