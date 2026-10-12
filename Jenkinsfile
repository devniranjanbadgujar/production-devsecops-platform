pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend CI') {
            steps {
                sh '''
                    cd backend
                    npm ci
                    mkdir -p reports
                    JEST_JUNIT_OUTPUT_DIR=reports npm test -- --reporters=default --reporters=jest-junit
                    npm run lint
                '''
            }
        }

        stage('Frontend CI') {
            steps {
                sh '''
                    cd frontend
                    npm ci
                    npm run lint
                    npm run build
                '''
            }
        }

        stage('Dependency Audit') {
            steps {
                sh '''
                    mkdir -p reports
                    cd backend
                    npm audit --json > ../reports/backend-npm-audit.json || true
                    cd ../frontend
                    npm audit --json > ../reports/frontend-npm-audit.json || true
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build \
                      -t production-devsecops-platform-backend:${BUILD_NUMBER} ./backend

                    docker build \
                      --build-arg VITE_API_BASE_URL= \
                      -t production-devsecops-platform-frontend:${BUILD_NUMBER} ./frontend
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                    trivy image --scanners vuln --format json \
                      --output reports/trivy-backend.json \
                      production-devsecops-platform-backend:${BUILD_NUMBER}

                    trivy image --scanners vuln --format json \
                      --output reports/trivy-frontend.json \
                      production-devsecops-platform-frontend:${BUILD_NUMBER}
                '''
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true,
                  testResults: 'backend/reports/junit.xml'

            archiveArtifacts artifacts: 'reports/*.json,backend/reports/junit.xml',
                             allowEmptyArchive: true
        }

        success {
            echo 'CI passed: tests, lint, builds, dependency audits, and image scans completed.'
        }

        failure {
            echo 'CI failed. Inspect the first failed stage and its console output.'
        }
    }
}