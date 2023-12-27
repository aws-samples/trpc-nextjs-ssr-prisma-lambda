import { CfnOutput, Duration, IgnoreMode, Stack } from 'aws-cdk-lib';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Database } from './database';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AllowedMethods, CachePolicy, Distribution, OriginRequestPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Trigger } from 'aws-cdk-lib/triggers';

export interface WebAppProps {
  database: Database;
}

export class WebApp extends Construct {
  constructor(scope: Construct, id: string, props: WebAppProps) {
    super(scope, id);

    const { database } = props;
    const databaseName = 'main';

    const handler = new DockerImageFunction(this, 'Handler', {
      code: DockerImageCode.fromImageAsset(join('..', 'webapp'), {
        file: 'Dockerfile',
        platform: Platform.LINUX_AMD64,
        ignoreMode: IgnoreMode.DOCKER,
        exclude: readFileSync('../webapp/.dockerignore').toString().split('\n'),
      }),
      timeout: Duration.seconds(30),
      environment: {
        ...database.getLambdaEnvironment(databaseName),
      },
      vpc: database.cluster.vpc,
      memorySize: 512,
      // architecture: Architecture.ARM_64,
    });
    database.allowInboundAccess(handler.connections);

    const integration = new HttpLambdaIntegration('Integration', handler, {});

    const api = new HttpApi(this, 'Api', {});
    api.addRoutes({
      path: '/{proxy+}',
      integration,
    });

    const cachedPathPatterns = ['/_next/static/*', '/favicon.ico', '/api/trpc/*'];
    const origin = new HttpOrigin(`${api.apiId}.execute-api.${Stack.of(this).region}.amazonaws.com`);

    const distribution = new Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html#add-origin-custom-headers-forward-authorization
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        allowedMethods: AllowedMethods.ALLOW_ALL,
      },
      additionalBehaviors: {
        ...Object.fromEntries(
          cachedPathPatterns.map((pathPattern) => [
            pathPattern,
            {
              origin,
              cachePolicy: CachePolicy.CACHING_OPTIMIZED,
              viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
              allowedMethods: AllowedMethods.ALLOW_ALL,
            },
          ])
        ),
      },
    });
    // new CfnOutput(this, 'HttpApiUrl', { value: api.url! });
    new CfnOutput(this, 'CloudFrontUrl', { value: `https://${distribution.domainName}` });

    const migration = new DockerImageFunction(this, 'MigrationRunner', {
      code: DockerImageCode.fromImageAsset('../webapp', {
        file: 'migration.Dockerfile',
        platform: Platform.LINUX_AMD64,
      }),
      timeout: Duration.minutes(3),
      environment: {
        ...props.database.getLambdaEnvironment(databaseName),
      },
      vpc: database.cluster.vpc,
    });

    database.allowInboundAccess(migration.connections);

    // Run a database migration during CDK deployment
    // Note that, in production, you may want to run a DB migration separately from an app deployment to prevent from
    // possible outage due to a migration failure or timeout.
    const trigger = new Trigger(this, "MigrationTrigger", {
      handler: migration,
    });
    // make sure a migration is executed after the database cluster is available.
    trigger.node.addDependency(database.cluster);

    new CfnOutput(this, 'MigrationCommand', {
      value: `aws lambda invoke --function-name ${migration.functionName} --cli-binary-format raw-in-base64-out --payload '{"command":"deploy"}' response.json`,
    });
    new CfnOutput(Stack.of(this), 'MigrationFunctionName', { value: migration.functionName });
  }
}
