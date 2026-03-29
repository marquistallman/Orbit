# Upgrade Plan: auth-service (20260328172343)

- **Generated**: 2026-03-28 17:23:43
- **HEAD Branch**: dani
- **HEAD Commit ID**: a65af34

## Available Tools

**JDKs**
- JDK 21.0.10: C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot\bin (used by Step 2 baseline)
- JDK 25.0.2: F:\Eclipse Adoptium\bin (used by Steps 3-4)

**Build Tools**
- Maven Wrapper: 3.9.12 (configured in `.mvn/wrapper/maven-wrapper.properties`) -> **<TO_BE_UPGRADED>** to Maven 4.0+ for Java 25 compatibility (Step 3)
- Maven executable via wrapper: `mvnw.cmd` (used for all verification commands)

## Guidelines

- Upgrade Java runtime to the latest LTS version (Java 25)

## Options

- Working branch: appmod/java-upgrade-20260328172343
- Run tests before and after the upgrade: true

## Upgrade Goals

- Upgrade Java from 21 to 25 (latest LTS)

### Technology Stack

| Technology/Dependency | Current | Min Compatible | Why Incompatible |
| --------------------- | ------- | -------------- | ---------------- |
| Java | 21 | 25 | User requested latest LTS runtime |
| Spring Boot (parent) | 4.0.3 | 4.0.3 | - |
| Spring Framework (via Boot BOM) | 7.0.x (managed) | 7.0.x | - |
| Maven (wrapper distribution) | 3.9.12 | 4.0+ | Plan rule for Java 25 requires Maven 4.0+ |
| maven-compiler-plugin (managed by Boot parent) | managed by 4.0.3 parent | version with Java 25 support | Validate under Java 25 during execution |
| maven-surefire-plugin (managed by Boot parent) | managed by 4.0.3 parent | version with Java 25 support | Validate under Java 25 during execution |
| Lombok | optional, version managed by BOM | current BOM version | - |

### Derived Upgrades

- Upgrade `java.version` in `pom.xml` from 21 to 25 (explicit user target).
- Upgrade Maven Wrapper distribution from 3.9.12 to 4.0+ in `.mvn/wrapper/maven-wrapper.properties` to satisfy Java 25 build-tool compatibility rule.
- Revalidate managed compiler/test plugins via full compile and test runs under Java 25 to confirm effective plugin compatibility in the inherited Spring Boot 4.0.3 build.

## Upgrade Steps

- **Step 1: Setup Environment**
  - **Rationale**: Confirm required JDKs are available and define the toolchain that will be used for baseline and target validation.
  - **Changes to Make**:
    - [ ] Verify JDK 21 and JDK 25 are available on this machine.
    - [ ] Verify Maven Wrapper is executable.
    - [ ] Record selected JDK and wrapper paths in progress logs.
  - **Verification**:
    - Command: `#appmod-list-jdks` and `mvnw.cmd -v`
    - Expected: JDK 21 and JDK 25 detected; wrapper command available

- **Step 2: Setup Baseline**
  - **Rationale**: Establish baseline compile and test pass rate before changing runtime/version settings.
  - **Changes to Make**:
    - [ ] Run baseline compile and test-compile under JDK 21.
    - [ ] Run baseline full tests under JDK 21.
    - [ ] Record pass/fail counts as acceptance baseline.
  - **Verification**:
    - Command: `mvnw.cmd clean test-compile -q` then `mvnw.cmd clean test -q`
    - JDK: `C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot`
    - Expected: Baseline compile result and baseline test pass rate documented

- **Step 3: Upgrade Runtime and Wrapper Compatibility**
  - **Rationale**: Apply the user target (Java 25) and align Maven Wrapper to the required Java 25-compatible major line.
  - **Changes to Make**:
    - [ ] Update `pom.xml` `java.version` from 21 to 25.
    - [ ] Update `.mvn/wrapper/maven-wrapper.properties` distribution URL from Maven 3.9.12 to Maven 4.0+.
    - [ ] Fix any compile issues surfaced by Java 25.
  - **Verification**:
    - Command: `mvnw.cmd clean test-compile -q`
    - JDK: `F:\Eclipse Adoptium`
    - Expected: Compilation success under Java 25

- **Step 4: Final Validation**
  - **Rationale**: Confirm all upgrade goals are met with clean compilation and full test success.
  - **Changes to Make**:
    - [ ] Verify target versions in `pom.xml` and wrapper properties.
    - [ ] Perform clean compile and test-compile under JDK 25.
    - [ ] Run full tests and fix all failures until 100% pass.
  - **Verification**:
    - Command: `mvnw.cmd clean test -q`
    - JDK: `F:\Eclipse Adoptium`
    - Expected: Compilation success and 100% tests passing

## Key Challenges

- **Maven Wrapper Major Upgrade for Java 25**
  - **Challenge**: Wrapper is pinned to Maven 3.9.12 while Java 25 target requires Maven 4.0+ per upgrade policy.
  - **Strategy**: Update wrapper distribution URL to Maven 4.x first, then validate compile/test behavior end-to-end with the wrapper.
- **Potential Java 25 Compiler or Test Runtime Regressions**
  - **Challenge**: JDK 25 may expose stricter checks or plugin/runtime incompatibilities in tests.
  - **Strategy**: Use iterative compile/test loop, addressing failures immediately in the same step until full pass rate is restored.

## Plan Review

- All placeholders were replaced.
- The plan contains mandatory Step 1 (Setup Environment), Step 2 (Setup Baseline), and final validation step.
- No unfixable limitations identified at planning time.
