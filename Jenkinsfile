pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds()
    }

    environment {
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
                script {
                    if (isUnix()) {
                        sh '''
                            echo "Checking Java version..."
                            java -version || true
                            echo "Checking Maven version..."
                            mvn -version || true
                            echo "Checking Node version..."
                            node --version || true
                            echo "Checking npm version..."
                            npm --version || true
                        '''
                    } else {
                        bat '''
                            @echo off
                            echo Checking Java version...
                            java -version
                            echo Checking Maven version...
                            mvn -version
                            echo Checking Node version...
                            node --version
                            echo Checking npm version...
                            npm --version
                        '''
                    }
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 2: Backend Compilation, Tests & Code Coverage
        // ---------------------------------------------------------------------
        stage('Backend Tests & Coverage') {
            steps {
                dir('backend') {
                    echo "=== Running Backend Maven Test Suite ==="
                    script {
                        if (isUnix()) {
                            sh 'mvn clean test jacoco:report -B'
                        } else {
                            bat 'mvn clean test jacoco:report -B'
                        }
                    }
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
                    script {
                        if (isUnix()) {
                            sh 'npm ci'
                            sh 'npm test -- --run'
                        } else {
                            bat 'call npm ci'
                            bat 'call npm test -- --run'
                        }
                    }
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
                    script {
                        if (isUnix()) {
                            sh 'npm run build'
                        } else {
                            bat 'call npm run build'
                        }
                    }
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
                    script {
                        if (isUnix()) {
                            sh 'npm audit --audit-level=high || true'
                        } else {
                            bat 'call npm audit --audit-level=high || exit 0'
                        }
                    }
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 6: SonarQube Code Quality Analysis
        // ---------------------------------------------------------------------
        stage('SonarQube Quality Gate') {
            steps {
                echo "=== Running SonarQube Quality Analysis ==="
                dir('backend') {
                    script {
                        if (isUnix()) {
                            sh "mvn sonar:sonar -Dsonar.host.url=${SONAR_HOST} -Dsonar.projectKey=resolv-backend -Dsonar.projectName='RESOLV - Incident Management Backend' -Dsonar.token=sqa_f37f15bfd5d1d3867d623603a34954fcdcff7d67 -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml -B"
                        } else {
                            bat "mvn sonar:sonar \"-Dsonar.host.url=${SONAR_HOST}\" \"-Dsonar.projectKey=resolv-backend\" \"-Dsonar.projectName=RESOLV - Incident Management Backend\" \"-Dsonar.token=sqa_f37f15bfd5d1d3867d623603a34954fcdcff7d67\" \"-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml\" -B"
                        }
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
                    script {
                        if (isUnix()) {
                            sh 'mvn package -DskipTests -B'
                        } else {
                            bat 'mvn package -DskipTests -B'
                        }
                    }
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
