pipeline {
    agent any

    parameters {
        string(
            name: 'AWS_REGION',
            defaultValue: 'ap-south-1',
            description: 'AWS region for ECR'
        )
        string(
            name: 'AWS_ACCOUNT_ID',
            defaultValue: '824953034387',
            description: '12-digit AWS account ID'
        )
        string(
            name: 'GITOPS_REPO_URL',
            defaultValue: 'https://github.com/devniranjanbadgujar/production-devsecops-gitops.git',
            description: 'GitOps repository URL'
        )
        string(
            name: 'GITOPS_BRANCH',
            defaultValue: 'main',
            description: 'GitOps branch to update'
        )
        string(
            name: 'JENKINS_REPORT_URL',
            defaultValue: '',
            description: 'Optional reachable backend Jenkins-report endpoint; leave blank until configured'
        )
    }

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
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()
                    env.SOURCE_BRANCH = (
                        env.BRANCH_NAME ?: env.GIT_BRANCH ?: ''
                    ).replace('origin/', '')
                    env.ECR_REGISTRY =
                        "${params.AWS_ACCOUNT_ID}.dkr.ecr.${params.AWS_REGION}.amazonaws.com"
                }
                echo "Source branch: ${env.SOURCE_BRANCH}; image tag: ${env.IMAGE_TAG}"
            }
        }

        stage('Backend CI') {
            steps {
                sh '''
                    set -eu
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
                    set -eu
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
                    set -eu
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
                    set -eu
                    docker build \
                      -t "production-devsecops-platform-backend:${IMAGE_TAG}" \
                      ./backend

                    docker build \
                      --build-arg VITE_API_BASE_URL= \
                      -t "production-devsecops-platform-frontend:${IMAGE_TAG}" \
                      ./frontend
                '''
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports

                    trivy image --scanners vuln --format json \
                      --output reports/trivy-backend.json \
                      "production-devsecops-platform-backend:${IMAGE_TAG}"

                    trivy image --scanners vuln --format json \
                      --output reports/trivy-frontend.json \
                      "production-devsecops-platform-frontend:${IMAGE_TAG}"
                '''
            }
        }

        stage('Publish Images to ECR') {
            when {
                expression { env.SOURCE_BRANCH == 'main' }
            }
            steps {
                sh '''
                    set -eu

                    printf '%s' "$AWS_ACCOUNT_ID" | grep -Eq '^[0-9]{12}$' || {
                        echo "ERROR: AWS_ACCOUNT_ID must be 12 digits."
                        exit 1
                    }

                    ACTUAL_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
                    if [ "$ACTUAL_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
                        echo "ERROR: AWS identity account does not match AWS_ACCOUNT_ID."
                        exit 1
                    fi

                    aws ecr get-login-password --region "$AWS_REGION" |
                      docker login --username AWS --password-stdin "$ECR_REGISTRY"

                    for SERVICE in backend frontend; do
                        LOCAL_IMAGE="production-devsecops-platform-${SERVICE}:${IMAGE_TAG}"
                        ECR_IMAGE="${ECR_REGISTRY}/production-devsecops-${SERVICE}"

                        # Commit-SHA tag is used by GitOps; build number aids traceability.
                        docker tag "$LOCAL_IMAGE" "${ECR_IMAGE}:${IMAGE_TAG}"
                        docker tag "$LOCAL_IMAGE" "${ECR_IMAGE}:${BUILD_NUMBER}"

                        docker push "${ECR_IMAGE}:${IMAGE_TAG}"
                        docker push "${ECR_IMAGE}:${BUILD_NUMBER}"
                    done
                '''
            }
        }

        stage('Update GitOps Repository') {
            when {
                expression { env.SOURCE_BRANCH == 'main' }
            }
            steps {
                dir('gitops-worktree') {
                    deleteDir()

                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "*/${params.GITOPS_BRANCH}"]],
                        userRemoteConfigs: [[
                            credentialsId: 'gitops-repo-token',
                            url: params.GITOPS_REPO_URL
                        ]]
                    ])

                    sh '''
                        set -eu

                        VALUES_FILE="apps/production-devsecops-platform/values-ecr.yaml"

                        test -f "$VALUES_FILE"
                        test -x scripts/validate-image-values.sh

                        sed -i -E \
                          "s|^[[:space:]]*image: .*production-devsecops-backend$|  image: ${ECR_REGISTRY}/production-devsecops-backend|" \
                          "$VALUES_FILE"

                        sed -i -E \
                          "s|^[[:space:]]*image: .*production-devsecops-frontend$|  image: ${ECR_REGISTRY}/production-devsecops-frontend|" \
                          "$VALUES_FILE"

                        sed -i -E \
                          "s|^[[:space:]]*tag:.*$|  tag: \\"${IMAGE_TAG}\\"|" \
                          "$VALUES_FILE"

                        ./scripts/validate-image-values.sh "$VALUES_FILE"
                        git diff --check
                        git add "$VALUES_FILE"
                    '''

                    script {
                        def hasChanges = sh(
                            script: 'git diff --cached --quiet',
                            returnStatus: true
                        ) != 0

                        if (hasChanges) {
                            sh '''
                                git config user.name "jenkins-devsecops-bot"
                                git config user.email "jenkins-devsecops-bot@users.noreply.github.com"
                            '''
                            sh "git commit -m 'deploy: update images to ${env.IMAGE_TAG}'"

                            withCredentials([
                                usernamePassword(
                                    credentialsId: 'gitops-repo-token',
                                    usernameVariable: 'GITOPS_USERNAME',
                                    passwordVariable: 'GITOPS_TOKEN'
                                )
                            ]) {
                                sh '''
                                    set +x
                                    set -eu

                                    cat > .git-askpass <<'ASKPASS'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\\n' "$GITOPS_USERNAME" ;;
  *Password*) printf '%s\\n' "$GITOPS_TOKEN" ;;
  *) exit 1 ;;
esac
ASKPASS
                                    chmod 700 .git-askpass
                                    trap 'rm -f .git-askpass' EXIT

                                    GIT_ASKPASS="$PWD/.git-askpass" \
                                      GIT_TERMINAL_PROMPT=0 \
                                      git push origin "HEAD:${GITOPS_BRANCH}"
                                '''
                            }
                        } else {
                            echo "GitOps already references image ${env.IMAGE_TAG}; no commit needed."
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true,
                  testResults: 'backend/reports/junit.xml'

            archiveArtifacts(
                artifacts: 'reports/*.json,backend/reports/junit.xml',
                allowEmptyArchive: true
            )

            script {
                if (params.JENKINS_REPORT_URL?.trim()) {
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
                        logs: "Jenkins build ${env.BUILD_TAG}; result=${result}. See Jenkins console and archived reports."
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
                              -X POST "$JENKINS_REPORT_URL" \
                              -H "Authorization: Bearer $JENKINS_REPORT_TOKEN" \
                              -H "Content-Type: application/json" \
                              --data-binary @jenkins-report.json ||
                              echo "WARNING: Jenkins report endpoint unavailable; continuing."
                        '''
                    }
                } else {
                    echo 'Jenkins report skipped: JENKINS_REPORT_URL is not configured.'
                }

                sh 'rm -f jenkins-report.json'
            }
        }

        success {
            echo 'CI completed successfully.'
        }

        failure {
            echo 'CI failed. Inspect the first failed stage and archived reports.'
        }
    }
}
