pipeline {
    parameters {
        booleanParam(name: 'PUBLISH_TO_ECR', defaultValue: false,
                     description: 'Push scanned images to Amazon ECR')
        string(name: 'AWS_REGION', defaultValue: 'ap-south-1',
               description: 'AWS region for ECR')
        string(name: 'AWS_ACCOUNT_ID', defaultValue: '824953034387',
               description: '12-digit AWS account ID')
        string(name: 'JENKINS_REPORT_URL',
               defaultValue: 'http://host.docker.internal:8090/api/integrations/jenkins/pipelines',
               description: 'Backend Jenkins-report endpoint')
    }
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

        stage('Publish Images to ECR') {
            when {
                expression { params.PUBLISH_TO_ECR }
            }
            steps {
                sh '''
                    set -eu
                    echo "$AWS_ACCOUNT_ID" | grep -Eq '^[0-9]{12}$' || {
                        echo "AWS_ACCOUNT_ID must be 12 digits."
                        exit 1
                    }

                    aws sts get-caller-identity
                    REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                    aws ecr get-login-password --region "$AWS_REGION" |
                      docker login --username AWS --password-stdin "$REGISTRY"

                    docker tag "production-devsecops-platform-backend:${BUILD_NUMBER}" \
                      "${REGISTRY}/production-devsecops-backend:${BUILD_NUMBER}"
                    docker tag "production-devsecops-platform-frontend:${BUILD_NUMBER}" \
                      "${REGISTRY}/production-devsecops-frontend:${BUILD_NUMBER}"

                    docker push "${REGISTRY}/production-devsecops-backend:${BUILD_NUMBER}"
                    docker push "${REGISTRY}/production-devsecops-frontend:${BUILD_NUMBER}"
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

            script {
            def result = currentBuild.currentResult ?: 'SUCCESS'
            def reportStatus = result == 'SUCCESS' ? 'success' :
                (result == 'ABORTED' ? 'aborted' : 'failed')

            def reportPayload = [
                projectName: env.JOB_NAME ?: 'production-devsecops-platform',
                branch: env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main',
                commitSha: sh(
                    script: 'git rev-parse HEAD',
                    returnStdout: true
                    ).trim(),
                status: reportStatus,
                durationSeconds: Math.max(
                    0,
                    (currentBuild.duration / 1000) as Integer
                ),
                buildNumber: env.BUILD_NUMBER,
                buildUrl: env.BUILD_URL,
                consoleUrl: "${env.BUILD_URL}console",
                logs: "Jenkins build ${env.BUILD_TAG}; result=${result}. See Jenkins console and archived reports for details."
            ]
            writeFile(
                file: 'jenkins-report.json',
                text: groovy.json.JsonOutput.toJson(reportPayload)
            )

            withCredentials([
                string(
                    credentialsId: 'jenkins-report-token',
                    variable: 'JENKINS_REPORT_TOKEN'
                )
            ]) {
                sh '''
                    set +x
                    curl --silent --show-error --fail \
                    --max-time 10 \
                    -X POST \
                    "$JENKINS_REPORT_URL" \
                    -H "Authorization: Bearer $JENKINS_REPORT_TOKEN" \
                    -H "Content-Type: application/json" \
                    --data-binary @jenkins-report.json || echo "WARNING: Jenkins report endpoint unavailable; continuing."
                '''
            }

            sh 'rm -f jenkins-report.json'
        }
        }


        success {
            echo 'CI passed: tests, lint, builds, dependency audits, and image scans completed.'
        }

        failure {
            echo 'CI failed. Inspect the first failed stage and its console output.'
        }
    }
}