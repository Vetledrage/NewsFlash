plugins {
    // Enables automatic JDK toolchain provisioning via Foojay.
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.5.0"
}

rootProject.name = "NewsFlash"

include(":apps:api")
