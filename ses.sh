#!/bin/bash

# AWS SES Setup Script for EventFinder
echo "🚀 Setting up AWS SES for EventFinder..."

# Your email address
YOUR_EMAIL="takudzwasamu@gmail.com"
REGION="ap-south-1"

# Set the region
export AWS_DEFAULT_REGION=$REGION

echo "📧 Setting up SES in region: $REGION"

# 1. Verify your email address
echo "1. Verifying email address: $YOUR_EMAIL"
aws ses verify-email-identity --email-address $YOUR_EMAIL

# 2. Create IAM policy for SES
echo "2. Creating SES IAM policy..."
cat > ses-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail",
                "ses:GetSendQuota",
                "ses:GetSendStatistics",
                "ses:ListVerifiedEmailAddresses"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create the policy
aws iam create-policy \
    --policy-name EventFinderSESPolicy \
    --policy-document file://ses-policy.json \
    --description "Policy for EventFinder Lambda to send emails via SES"

# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# 3. Find and attach policy to Lambda role
echo "3. Finding Lambda execution role..."
LAMBDA_ROLE_NAME=$(aws iam list-roles --query 'Roles[?contains(RoleName, `search-events`) || contains(RoleName, `lambda`)].RoleName' --output text | head -1)

if [ -z "$LAMBDA_ROLE_NAME" ]; then
    echo "❌ Could not find Lambda role. Please attach the policy manually."
    echo "Policy ARN: arn:aws:iam::$ACCOUNT_ID:policy/EventFinderSESPolicy"
else
    echo "Found Lambda role: $LAMBDA_ROLE_NAME"
    echo "Attaching SES policy to Lambda role..."
    aws iam attach-role-policy \
        --role-name $LAMBDA_ROLE_NAME \
        --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/EventFinderSESPolicy
fi

# 4. Update Lambda environment variables
echo "4. Finding your Lambda function..."
LAMBDA_FUNCTION_NAME=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `search-events`)].FunctionName' --output text | head -1)

if [ -z "$LAMBDA_FUNCTION_NAME" ]; then
    echo "❌ Could not find Lambda function. Please set environment variable manually:"
    echo "FROM_EMAIL=takudzwasamu@gmail.com"
else
    echo "Found Lambda function: $LAMBDA_FUNCTION_NAME"
    echo "Setting environment variable..."
    aws lambda update-function-configuration \
        --function-name $LAMBDA_FUNCTION_NAME \
        --environment Variables="{FROM_EMAIL=takudzwasamu@gmail.com,EVENTS_TABLE=EventFinderUserSearches}"
fi

# 5. Check current sending quota
echo "5. Checking SES status..."
aws ses get-send-quota

echo "✅ SES Setup Complete!"
echo ""
echo "📧 IMPORTANT: Check your Gmail (takudzwasamu@gmail.com) and click the verification link!"
echo ""
echo "🔧 If anything failed, manual setup:"
echo "1. SES Console: https://console.aws.amazon.com/ses/home?region=$REGION#verified-senders-email:"
echo "2. Lambda Console: https://console.aws.amazon.com/lambda/home?region=$REGION#/functions"
echo "3. Set FROM_EMAIL = takudzwasamu@gmail.com in Lambda environment variables"

# Clean up
rm ses-policy.json

echo "🎉 Ready to send emails!"