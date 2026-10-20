pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    environment {
        // Environment configuration variables (never hardcode real secrets)
        APP_NAME = 'resolv-incident-management'
        SONAR_HOST = "${env.SONAR_HOST_URL ?: 'http://localhost:9000'}"
    }

    stages {
        // ---------------------------------------------------------------------
        // Stage 1: Workspace & Toolchain Verification
        // ---------------------------------------------------------------------
        stage('Environment Verification') {
            steps {
                echo "=== Verifying CI Build Environment ==="
                sh label: 'Toolchain Probe', script: '''
                    echo "Checking Java version..."
                    java -version || true
                    echo "Checking Maven version..."
                    mvn -version || true
                    echo "Checking Node version..."
                    node --version || true
                    echo "Checking npm version..."
                    npm --version || true
                '''
            }
        }

        // ---------------------------------------------------------------------
        // Stage 2: Backend Compilation, Tests & Code Coverage
        // ---------------------------------------------------------------------
        stage('Backend Tests & Coverage') {
            steps {
                dir('backend') {
                    echo "=== Running Backend Maven Test Suite ==="
                    // Runs unit, security hardening, and E2E regression tests with JaCoCo coverage
                    sh 'mvn clean test jacoco:report -B'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 3: Frontend Unit & Security Tests
        // ---------------------------------------------------------------------
        stage('Frontend Tests') {
            steps {
                dir('frontend') {
                    echo "=== Installing Dependencies & Executing Vitest Suite ==="
                    sh 'npm ci'
                    sh 'npm test -- --run'
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 4: Frontend Production Bundle Compilation
        // ---------------------------------------------------------------------
        stage('Frontend Production Build') {
            steps {
                dir('frontend') {
                    echo "=== Building Production Distribution Assets ==="
                    sh 'npm run build'
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 5: Dependency Security Audit
        // ---------------------------------------------------------------------
        stage('Dependency Vulnerability Audit') {
            steps {
                dir('frontend') {
                    echo "=== Auditing Frontend Packages for High/Critical Vulnerabilities ==="
                    sh 'npm audit --audit-level=high || true'
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 6: SonarQube Code Quality Analysis (Conditional)
        // ---------------------------------------------------------------------
        stage('SonarQube Quality Gate') {
            when {
                expression {
                    // Check if a SonarQube server is reachable before attempting scan
                    def status = sh(
                        script: 'curl -s -m 5 -o /dev/null -w "%{http_code}" ${SONAR_HOST}/api/system/status || echo "000"',
                        returnStdout: true
                    ).trim()
                    echo "SonarQube Server Probe Status Code: ${status}"
                    return status == "200"
                }
            }
            steps {
                echo "=== SonarQube Server Active: Running Quality Analysis ==="
                dir('backend') {
                    withCredentials([string(credentialsId: 'SONAR_TOKEN', variable: 'SONAR_AUTH_TOKEN')]) {
                        sh '''
                            mvn sonar:sonar \
                                -Dsonar.host.url=${SONAR_HOST} \
                                -Dsonar.token=${SONAR_AUTH_TOKEN} \
                                -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
                                -B
                        '''
                    }
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 7: Package & Archive Production Build Artifacts
        // ---------------------------------------------------------------------
        stage('Package & Archive Artifacts') {
            steps {
                dir('backend') {
                    echo "=== Packaging Backend Executable JAR ==="
                    sh 'mvn package -DskipTests -B'
                }
                echo "=== Archiving Verified Build Artifacts ==="
                archiveArtifacts artifacts: 'backend/target/*.jar, frontend/dist/**', fingerprint: true, allowEmptyArchive: false
            }
        }
    }

    // -------------------------------------------------------------------------
    // Post-Build Notifications and Cleanup
    // -------------------------------------------------------------------------
    post {
        success {
            echo "SUCCESS: RESOLV CI Pipeline completed cleanly. All tests passed and artifacts archived."
        }
        failure {
            echo "FAILURE: RESOLV CI Pipeline failed! Inspect stage logs and test failure reports above."
        }
        always {
            cleanWs deleteDirs: false, notFailBuild: true
        }
    }
}
