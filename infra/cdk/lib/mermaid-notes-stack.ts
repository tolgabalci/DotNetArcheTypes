import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cdk from 'aws-cdk-lib';
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export type MermaidNotesStackProps = StackProps & {
  stageName: string;
  githubOwner: string;
  githubRepo: string;
  webAllowedOrigins: string[];
  callbackUrls: string[];
  logoutUrls: string[];
  cognitoDomainPrefix: string;
};

export class MermaidNotesStack extends Stack {
  constructor(scope: Construct, id: string, props: MermaidNotesStackProps) {
    super(scope, id, props);

    const production = props.stageName === 'production';

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: production ? 2 : 1
    });

    const webBucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: production,
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !production
    });

    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5)
        }
      ]
    });

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      standardAttributes: {
        email: {
          required: true,
          mutable: true
        }
      },
      passwordPolicy: {
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true
      }
    });

    const userPoolDomain = userPool.addDomain('Domain', {
      cognitoDomain: {
        domainPrefix: props.cognitoDomainPrefix.toLowerCase()
      }
    });

    const webUrl = `https://${distribution.distributionDomainName}`;
    const userPoolClient = userPool.addClient('WebClient', {
      authFlows: {
        userSrp: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: [...props.callbackUrls, webUrl],
        logoutUrls: [...props.logoutUrls, webUrl]
      },
      preventUserExistenceErrors: true,
      generateSecret: false,
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.days(30)
    });

    const databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      allowAllOutbound: true
    });

    const database = new rds.DatabaseInstance(this, 'Database', {
      vpc,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.of('17.4', '17')
      }),
      credentials: rds.Credentials.fromGeneratedSecret('mermaidnotes'),
      databaseName: 'mermaidnotes',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      multiAz: production,
      deletionProtection: production,
      backupRetention: production ? Duration.days(7) : Duration.days(1),
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      securityGroups: [databaseSecurityGroup],
      publiclyAccessible: false
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc
    });

    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      retention: production ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
    });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      desiredCount: production ? 2 : 1,
      cpu: 512,
      memoryLimitMiB: 1024,
      circuitBreaker: {
        rollback: true
      },
      minHealthyPercent: 100,
      publicLoadBalancer: true,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(currentDirectory, '../../..'), {
          file: 'src/api/Dockerfile',
          exclude: [
            '.git',
            '**/bin',
            '**/obj',
            '**/node_modules',
            'src/web/dist',
            'coverage',
            'playwright-report',
            'infra/cdk/cdk.out'
          ]
        }),
        containerPort: 8080,
        environment: {
          ASPNETCORE_ENVIRONMENT: production ? 'Production' : 'Staging',
          Authentication__Mode: 'Cognito',
          Authentication__Cognito__Authority: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
          Authentication__Cognito__ClientId: userPoolClient.userPoolClientId,
          Cors__AllowedOrigins__0: webUrl,
          Database__MigrateOnStartup: 'true',
          Database__Host: database.dbInstanceEndpointAddress,
          Database__Port: database.dbInstanceEndpointPort,
          Database__Name: 'mermaidnotes',
          Database__Username: 'mermaidnotes'
        },
        secrets: {
          Database__Password: ecs.Secret.fromSecretsManager(database.secret!, 'password')
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'api',
          logGroup: apiLogGroup
        })
      }
    });

    database.connections.allowDefaultPortFrom(service.service, 'API service connects to PostgreSQL');
    service.targetGroup.configureHealthCheck({
      path: '/health/ready',
      healthyHttpCodes: '200'
    });

    const githubProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com']
    });

    const githubDeployRole = new iam.Role(this, 'GitHubDeployRole', {
      assumedBy: new iam.WebIdentityPrincipal(githubProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${props.githubOwner}/${props.githubRepo}:*`
        }
      }),
      description: 'GitHub Actions role for deploying Mermaid Notes with CDK.'
    });

    githubDeployRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'));
    githubDeployRole.addToPolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: ['*'],
      conditions: {
        StringEqualsIfExists: {
          'iam:PassedToService': [
            'ecs-tasks.amazonaws.com',
            'cloudformation.amazonaws.com'
          ]
        }
      }
    }));

    const webDistPath = path.join(currentDirectory, '../../../src/web/dist');
    if (fs.existsSync(webDistPath)) {
      new s3deploy.BucketDeployment(this, 'WebDeployment', {
        sources: [s3deploy.Source.asset(webDistPath)],
        destinationBucket: webBucket,
        distribution,
        distributionPaths: ['/*']
      });
    }

    new CfnOutput(this, 'ApiUrl', {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`
    });
    new CfnOutput(this, 'WebUrl', {
      value: webUrl
    });
    new CfnOutput(this, 'WebBucketName', {
      value: webBucket.bucketName
    });
    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId
    });
    new CfnOutput(this, 'CognitoAuthority', {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`
    });
    new CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId
    });
    new CfnOutput(this, 'CognitoClientId', {
      value: userPoolClient.userPoolClientId
    });
    new CfnOutput(this, 'GitHubDeployRoleArn', {
      value: githubDeployRole.roleArn
    });
  }
}
