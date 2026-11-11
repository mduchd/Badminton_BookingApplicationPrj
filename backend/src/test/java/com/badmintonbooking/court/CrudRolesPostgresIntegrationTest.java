package com.badmintonbooking.court;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/** Runs the same HTTP/security/CRUD contracts against the actual Flyway PostgreSQL schema. */
@SpringBootTest(properties={"ai.enabled=false","app.integrations.initial-delay-ms=3600000"})
@EnabledIfEnvironmentVariable(named="RUN_POSTGRES_TESTS",matches="true")
class CrudRolesPostgresIntegrationTest extends CrudRolesIntegrationTest {}
