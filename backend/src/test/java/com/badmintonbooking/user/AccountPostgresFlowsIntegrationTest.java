package com.badmintonbooking.user;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/** Reuse the account/provider contract tests against Flyway's real PostgreSQL schema. */
@SpringBootTest(properties={
    "app.password-reset.enabled=true", "app.password-reset.from=no-reply@example.test",
    "app.integrations.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    "app.integrations.initial-delay-ms=3600000", "ai.enabled=false"
})
@EnabledIfEnvironmentVariable(named="RUN_POSTGRES_TESTS",matches="true")
class AccountPostgresFlowsIntegrationTest extends AccountFlowsIntegrationTest {}
